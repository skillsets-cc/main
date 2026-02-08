/**
 * ReservationCoordinator Durable Object
 *
 * Manages ghost entry reservations with SQLite-backed storage.
 * Single named instance ("singleton") for serialized access.
 *
 * Storage schema:
 * - slot:{batchId} -> ReservedSlotData | SubmittedSlotData (discriminated union)
 * - user:{userId} -> batchId (string)
 * - config -> { totalGhostSlots: number, ttlDays: number, cohort: number }
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './auth';

const DEFAULT_CONFIG = {
  totalGhostSlots: 10,
  ttlDays: 7,
  cohort: 1,
};

const SLOT_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
const SKILLSET_ID_REGEX = /^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

interface ReservedSlotData {
  status: 'reserved';
  userId: string;
  githubLogin: string;
  expiresAt: number;
}

interface SubmittedSlotData {
  status: 'submitted';
  userId: string;
  githubLogin: string;
  skillsetId: string;
  submittedAt: number;
}

type SlotData = ReservedSlotData | SubmittedSlotData;

interface Config {
  totalGhostSlots: number;
  ttlDays: number;
  cohort: number;
}

interface ReserveRequest {
  slotId: string;
  userId: string;
  githubLogin: string;
}

interface ReleaseRequest {
  userId: string;
}

interface ConfigUpdateRequest {
  totalGhostSlots?: number;
  ttlDays?: number;
  cohort?: number;
}

/**
 * Parse batch ID into components.
 */
function parseBatchId(id: string): { position: number; batchSize: number; cohort: number } {
  const [pos, size, cohort] = id.split('.');
  return { position: parseInt(pos, 10), batchSize: parseInt(size, 10), cohort: parseInt(cohort, 10) };
}

/**
 * Format batch ID from components.
 */
function formatBatchId(position: number, batchSize: number, cohort: number): string {
  return `${position}.${batchSize}.${String(cohort).padStart(3, '0')}`;
}

/**
 * Validate batch ID against current config. Returns error string or null.
 */
function validateBatchId(id: string, config: Config): string | null {
  if (!SLOT_ID_REGEX.test(id)) return 'Invalid batch ID format';
  const { position, batchSize, cohort } = parseBatchId(id);
  if (position < 1 || position > batchSize) return 'Position out of range';
  if (batchSize !== config.totalGhostSlots) return 'Batch size does not match current cohort';
  if (cohort !== config.cohort) return 'Cohort does not match current cohort';
  return null;
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
   * - GET /verify -> Verify batch ID + login/userId match (for CI)
   * - POST /submit -> Transition slot to submitted (for maintainer)
   * - GET /lookup -> Find user's batch ID by GitHub user ID (for CLI)
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

      if (path === '/verify' && request.method === 'GET') {
        return this.handleVerify(request);
      }

      if (path === '/submit' && request.method === 'POST') {
        return this.handleSubmit(request);
      }

      if (path === '/lookup' && request.method === 'GET') {
        return this.handleLookup(request);
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

    const slotEntries = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });
    const slots: Record<string, {
      status: 'available' | 'reserved' | 'submitted';
      expiresAt?: number;
      skillsetId?: string;
    }> = {};

    // Initialize current cohort slots as available
    for (let i = 1; i <= config.totalGhostSlots; i++) {
      const slotId = formatBatchId(i, config.totalGhostSlots, config.cohort);
      slots[slotId] = { status: 'available' };
    }

    // Status discrimination — expired slots are treated as available in the
    // response but their storage entries are NOT deleted. This preserves slot
    // data for the maintainer /submit flow.
    const now = Math.floor(Date.now() / 1000);

    for (const [key, data] of slotEntries) {
      const slotId = key.replace('slot:', '');

      if (data.status === 'submitted') {
        // Submitted slots are permanent — include from ALL cohorts, not just current.
        const submitted = data as SubmittedSlotData;
        slots[slotId] = { status: 'submitted', skillsetId: submitted.skillsetId };
      } else if (data.status === 'reserved') {
        const reserved = data as ReservedSlotData;
        if (reserved.expiresAt > now && slots[slotId]) {
          // Active reservation — show as reserved
          slots[slotId] = { status: 'reserved', expiresAt: reserved.expiresAt };
        }
        // Expired reservations: slot stays 'available' in the response.
        // Storage entry is preserved so /submit can still transition it.
      }
    }

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
        cohort: config.cohort,
        userSlot,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * POST /reserve - Reserve a slot for a user.
   * Request body: { slotId: string, userId: string, githubLogin: string }
   *
   * Returns 201 with { slotId, expiresAt } on success.
   * Returns 409 if slot taken or user already has reservation.
   * Returns 404 if slot is invalid.
   */
  private async handleReserve(request: Request): Promise<Response> {
    const body = await request.json() as ReserveRequest;
    const { slotId, userId, githubLogin } = body;

    const config = await this.getConfig();
    const error = validateBatchId(slotId, config);
    if (error) {
      return new Response(
        JSON.stringify({ error: 'slot_not_found', message: error }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a reservation
    const existingSlot = await this.ctx.storage.get<string>(`user:${userId}`);
    if (existingSlot) {
      // Verify it's not expired
      const slotData = await this.ctx.storage.get<SlotData>(`slot:${existingSlot}`);
      if (slotData && slotData.status === 'reserved' && slotData.expiresAt > Math.floor(Date.now() / 1000)) {
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
    if (slotData && slotData.status === 'reserved' && slotData.expiresAt > now) {
      return new Response(
        JSON.stringify({ error: 'slot_taken', message: 'Slot is already reserved' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reserve the slot — atomic write coalescing
    const expiresAt = now + config.ttlDays * 86400;
    const newSlotData: ReservedSlotData = {
      status: 'reserved',
      userId,
      githubLogin,
      expiresAt,
    };

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
   * Returns 409 if slot is in submitted state.
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

    // Guard: submitted slots are terminal — cannot be released
    const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
    if (slotData?.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'already_submitted', message: 'Cannot release a submitted slot' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
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
   * Request body: { totalGhostSlots?: number, ttlDays?: number, cohort?: number }
   *
   * Returns 200 with merged config.
   * Returns 400 if validation fails.
   */
  private async handleConfigUpdate(request: Request): Promise<Response> {
    const body = await request.json() as ConfigUpdateRequest;
    const currentConfig = await this.getConfig();

    // Reject batch_size change within same cohort
    if (body.totalGhostSlots !== undefined &&
        body.totalGhostSlots !== currentConfig.totalGhostSlots &&
        (body.cohort === undefined || body.cohort === currentConfig.cohort)) {
      return new Response(
        JSON.stringify({
          error: 'invalid_config',
          message: 'Cannot change totalGhostSlots within a cohort. Increment cohort to create a new batch.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate totalGhostSlots
    if (body.totalGhostSlots !== undefined) {
      if (typeof body.totalGhostSlots !== 'number' || body.totalGhostSlots < 1 || body.totalGhostSlots > 100) {
        return new Response(
          JSON.stringify({ error: 'invalid_config', message: 'totalGhostSlots must be between 1 and 100' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate ttlDays
    if (body.ttlDays !== undefined) {
      if (typeof body.ttlDays !== 'number' || body.ttlDays < 1 || body.ttlDays > 30) {
        return new Response(
          JSON.stringify({ error: 'invalid_config', message: 'ttlDays must be between 1 and 30' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate cohort if provided
    if (body.cohort !== undefined) {
      if (typeof body.cohort !== 'number' || body.cohort < 1 || body.cohort > 999) {
        return new Response(
          JSON.stringify({ error: 'invalid_config', message: 'cohort must be between 1 and 999' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // If cohort changes, wipe reserved slots but preserve submitted slot data.
    if (body.cohort !== undefined && body.cohort !== currentConfig.cohort) {
      const allSlots = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });
      const keysToDelete: string[] = [];
      for (const [key, data] of allSlots) {
        // Always delete user index key — frees user for new cohort reservations
        keysToDelete.push(`user:${data.userId}`);
        // Preserve submitted slot data (terminal state survives cohort changes)
        if (data.status === 'submitted') continue;
        keysToDelete.push(key);
      }
      // Chunk to 128 keys per batch (DO storage.delete limit)
      for (let i = 0; i < keysToDelete.length; i += 128) {
        await this.ctx.storage.delete(keysToDelete.slice(i, i + 128));
      }
    }

    // Merge config
    const newConfig: Config = {
      ...currentConfig,
      ...body,
    };

    // Save new config
    await this.ctx.storage.put('config', newConfig);

    return new Response(
      JSON.stringify(newConfig),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * GET /verify - Verify batch ID + login/userId match (for CI).
   * Query params: batchId, login?, userId?
   *
   * Returns { valid: true, batchId } or { valid: false, reason }.
   */
  private async handleVerify(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');
    const login = url.searchParams.get('login');
    const userId = url.searchParams.get('userId');

    if (!batchId || !SLOT_ID_REGEX.test(batchId)) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_batch_id' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slotData = await this.ctx.storage.get<SlotData>(`slot:${batchId}`);
    if (!slotData) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'not_reserved' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Already-submitted slots cannot be used for a new PR
    if (slotData.status === 'submitted') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'already_submitted' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Expired reserved slots fail verification
    if (slotData.expiresAt <= Math.floor(Date.now() / 1000)) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'not_reserved' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Match by login OR userId (handles GitHub username renames)
    const loginMatch = login && slotData.githubLogin === login;
    const userIdMatch = userId && slotData.userId === userId;

    if (!loginMatch && !userIdMatch) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'login_mismatch' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, batchId }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * POST /submit - Transition slot to submitted (for maintainer).
   * Request body: { batchId: string, skillsetId: string }
   *
   * Returns 200 with { batchId, status, skillsetId } on success.
   * Returns 404 if slot not reserved.
   * Returns 409 if already submitted.
   * Returns 400 for invalid inputs.
   */
  private async handleSubmit(request: Request): Promise<Response> {
    let body: { batchId?: string; skillsetId?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'invalid_body', message: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { batchId, skillsetId } = body;

    // Validate batchId format only — NOT against current config.
    // Maintainer submit is authoritative and must work across cohorts.
    if (!batchId || !SLOT_ID_REGEX.test(batchId)) {
      return new Response(
        JSON.stringify({ error: 'invalid_batch_id', message: 'batchId is required and must match format N.N.NNN' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate skillsetId format
    if (!skillsetId || !SKILLSET_ID_REGEX.test(skillsetId) || skillsetId.length > 200) {
      return new Response(
        JSON.stringify({ error: 'invalid_skillset_id', message: 'skillsetId must match @namespace/Name format (max 200 chars)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slotData = await this.ctx.storage.get<SlotData>(`slot:${batchId}`);
    if (!slotData) {
      return new Response(
        JSON.stringify({ error: 'not_reserved', message: 'Slot has no reservation' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check discriminant — reject if already submitted
    if (slotData.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'already_submitted', message: 'Slot is already submitted' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Note: expiry is NOT checked. Maintainer submit is authoritative.

    // Transition to submitted — replace slot data
    const submitted: SubmittedSlotData = {
      status: 'submitted',
      userId: slotData.userId,
      githubLogin: slotData.githubLogin,
      skillsetId,
      submittedAt: Math.floor(Date.now() / 1000),
    };
    await this.ctx.storage.put(`slot:${batchId}`, submitted);

    // Delete user index key — reservation is fulfilled
    await this.ctx.storage.delete(`user:${slotData.userId}`);

    return new Response(
      JSON.stringify({ batchId, status: 'submitted', skillsetId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * GET /lookup - Find user's batch ID by GitHub user ID (for CLI).
   * Query params: githubId
   *
   * Returns { batchId: string | null }.
   */
  private async handleLookup(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const githubId = url.searchParams.get('githubId');

    if (!githubId) {
      return new Response(
        JSON.stringify({ batchId: null }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slotId = await this.ctx.storage.get<string>(`user:${githubId}`);
    if (!slotId) {
      return new Response(
        JSON.stringify({ batchId: null }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Only return batch ID for actively reserved slots.
    // Submitted slots return null — the reservation is fulfilled.
    const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
    if (!slotData || slotData.status === 'submitted' ||
        (slotData.status === 'reserved' && slotData.expiresAt <= Math.floor(Date.now() / 1000))) {
      return new Response(
        JSON.stringify({ batchId: null }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ batchId: slotId }),
      { headers: { 'Content-Type': 'application/json' } }
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
