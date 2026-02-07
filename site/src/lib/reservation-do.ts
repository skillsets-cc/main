/**
 * ReservationCoordinator Durable Object
 *
 * Manages ghost entry reservations with SQLite-backed storage.
 * Single named instance ("singleton") for serialized access.
 *
 * Storage schema:
 * - slot:{slotId} -> { userId: string, expiresAt: number }
 * - user:{userId} -> slotId
 * - config -> { totalGhostSlots: number, ttlDays: number }
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './auth';

const DEFAULT_CONFIG = {
  totalGhostSlots: 10,
  ttlDays: 7,
};

const SLOT_ID_REGEX = /^ghost-\d+$/;

interface SlotData {
  userId: string;
  expiresAt: number;
}

interface Config {
  totalGhostSlots: number;
  ttlDays: number;
}

interface ReserveRequest {
  slotId: string;
  userId: string;
}

interface ReleaseRequest {
  userId: string;
}

interface ConfigUpdateRequest {
  totalGhostSlots?: number;
  ttlDays?: number;
}

export class ReservationCoordinator extends DurableObject<Env> {
  /**
   * Handle all operations via HTTP-like interface.
   *
   * Endpoints:
   * - GET /status -> All slot states + config + userSlot
   * - POST /reserve -> Reserve a slot
   * - DELETE /release -> Release user's reservation
   * - POST /config -> Update configuration (maintainer-only, enforced by API route)
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/status' && request.method === 'GET') {
        return this.handleGetStatus(request);
      }

      if (path === '/reserve' && request.method === 'POST') {
        return this.handleReserve(request);
      }

      if (path === '/release' && request.method === 'DELETE') {
        return this.handleRelease(request);
      }

      if (path === '/config' && request.method === 'POST') {
        return this.handleConfigUpdate(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('[ReservationCoordinator] Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * GET /status - Return all slot states and config.
   * If X-User-Id header present, include userSlot.
   */
  private async handleGetStatus(request: Request): Promise<Response> {
    const userId = request.headers.get('X-User-Id');
    const config = await this.getConfig();

    // Batch read all slot data
    const slotEntries = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });
    const slots: Record<string, { status: 'available' | 'reserved'; expiresAt?: number }> = {};

    // Initialize all slots as available
    for (let i = 1; i <= config.totalGhostSlots; i++) {
      const slotId = `ghost-${i}`;
      slots[slotId] = { status: 'available' };
    }

    // Lazy expiry: mark expired reservations as available, collect for deletion
    const now = Math.floor(Date.now() / 1000);
    const expiredKeys: string[] = [];
    const expiredUserKeys: string[] = [];

    for (const [key, data] of slotEntries) {
      if (data.expiresAt <= now) {
        // Expired — treat as available
        expiredKeys.push(key);
        expiredUserKeys.push(`user:${data.userId}`);
      } else {
        // Active reservation
        const slotId = key.replace('slot:', '');
        if (slots[slotId]) {
          slots[slotId] = { status: 'reserved', expiresAt: data.expiresAt };
        }
      }
    }

    // Batch delete expired entries (non-blocking cleanup)
    if (expiredKeys.length > 0) {
      await this.ctx.storage.delete([...expiredKeys, ...expiredUserKeys]);
    }

    // Determine userSlot if userId provided
    let userSlot: string | null = null;
    if (userId) {
      const userSlotId = await this.ctx.storage.get<string>(`user:${userId}`);
      if (userSlotId && slots[userSlotId]?.status === 'reserved') {
        userSlot = userSlotId;
      }
    }

    return new Response(
      JSON.stringify({
        slots,
        totalGhostSlots: config.totalGhostSlots,
        userSlot,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * POST /reserve - Reserve a slot for a user.
   * Request body: { slotId: string, userId: string }
   *
   * Returns 201 with { slotId, expiresAt } on success.
   * Returns 409 if slot taken or user already has reservation.
   * Returns 404 if slot is invalid.
   */
  private async handleReserve(request: Request): Promise<Response> {
    const body = await request.json() as ReserveRequest;
    const { slotId, userId } = body;

    // Validate slot ID format and range
    if (!SLOT_ID_REGEX.test(slotId)) {
      return new Response(
        JSON.stringify({ error: 'slot_not_found', message: 'Invalid slot ID format' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const config = await this.getConfig();
    const slotNumber = parseInt(slotId.replace('ghost-', ''), 10);
    if (slotNumber < 1 || slotNumber > config.totalGhostSlots) {
      return new Response(
        JSON.stringify({ error: 'slot_not_found', message: 'Slot number out of range' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a reservation
    const existingSlot = await this.ctx.storage.get<string>(`user:${userId}`);
    if (existingSlot) {
      // Verify it's not expired
      const slotData = await this.ctx.storage.get<SlotData>(`slot:${existingSlot}`);
      if (slotData && slotData.expiresAt > Math.floor(Date.now() / 1000)) {
        return new Response(
          JSON.stringify({
            error: 'user_has_reservation',
            message: 'User already has a reservation',
            existingSlot,
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if slot is available (not reserved by someone else)
    const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
    const now = Math.floor(Date.now() / 1000);
    if (slotData && slotData.expiresAt > now) {
      return new Response(
        JSON.stringify({ error: 'slot_taken', message: 'Slot is already reserved' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reserve the slot — atomic write coalescing
    const expiresAt = now + config.ttlDays * 86400;
    const newSlotData: SlotData = { userId, expiresAt };

    // Write both keys WITHOUT await between them (atomic transaction)
    this.ctx.storage.put(`slot:${slotId}`, newSlotData);
    this.ctx.storage.put(`user:${userId}`, slotId);

    return new Response(
      JSON.stringify({ slotId, expiresAt }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * DELETE /release - Release user's reservation.
   * Request body: { userId: string }
   *
   * Returns 200 with { released: slotId } on success.
   * Returns 404 if user has no reservation.
   */
  private async handleRelease(request: Request): Promise<Response> {
    const body = await request.json() as ReleaseRequest;
    const { userId } = body;

    const slotId = await this.ctx.storage.get<string>(`user:${userId}`);
    if (!slotId) {
      return new Response(
        JSON.stringify({ error: 'no_reservation', message: 'User has no reservation' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete both slot and user keys — atomic write coalescing
    this.ctx.storage.delete(`slot:${slotId}`);
    this.ctx.storage.delete(`user:${userId}`);

    return new Response(
      JSON.stringify({ released: slotId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * POST /config - Update configuration.
   * Request body: { totalGhostSlots?: number, ttlDays?: number }
   *
   * Returns 200 with merged config.
   * Returns 400 if validation fails.
   *
   * If totalGhostSlots is reduced, orphaned slots are cleaned up.
   */
  private async handleConfigUpdate(request: Request): Promise<Response> {
    const body = await request.json() as ConfigUpdateRequest;
    const currentConfig = await this.getConfig();

    // Validate inputs
    if (body.totalGhostSlots !== undefined) {
      if (typeof body.totalGhostSlots !== 'number' || body.totalGhostSlots < 1 || body.totalGhostSlots > 100) {
        return new Response(
          JSON.stringify({ error: 'invalid_config', message: 'totalGhostSlots must be between 1 and 100' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (body.ttlDays !== undefined) {
      if (typeof body.ttlDays !== 'number' || body.ttlDays < 1 || body.ttlDays > 30) {
        return new Response(
          JSON.stringify({ error: 'invalid_config', message: 'ttlDays must be between 1 and 30' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Merge config
    const newConfig: Config = {
      ...currentConfig,
      ...body,
    };

    // If shrinking slots, clean up orphaned reservations
    if (body.totalGhostSlots !== undefined && body.totalGhostSlots < currentConfig.totalGhostSlots) {
      const keysToDelete: string[] = [];
      const userKeysToDelete: string[] = [];

      // Find slots beyond the new range
      for (let i = body.totalGhostSlots + 1; i <= currentConfig.totalGhostSlots; i++) {
        const slotId = `ghost-${i}`;
        const slotKey = `slot:${slotId}`;
        const slotData = await this.ctx.storage.get<SlotData>(slotKey);

        if (slotData) {
          keysToDelete.push(slotKey);
          userKeysToDelete.push(`user:${slotData.userId}`);
        }
      }

      if (keysToDelete.length > 0) {
        await this.ctx.storage.delete([...keysToDelete, ...userKeysToDelete]);
      }
    }

    // Save new config
    await this.ctx.storage.put('config', newConfig);

    return new Response(
      JSON.stringify(newConfig),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get current config or return defaults.
   */
  private async getConfig(): Promise<Config> {
    const config = await this.ctx.storage.get<Config>('config');
    return config ?? DEFAULT_CONFIG;
  }
}

/**
 * Get the singleton DO stub for reservations.
 */
export function getReservationStub(env: Env): DurableObjectStub {
  const id = env.RESERVATIONS.idFromName('singleton');
  return env.RESERVATIONS.get(id);
}
