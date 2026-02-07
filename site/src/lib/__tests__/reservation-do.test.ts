/**
 * Tests for ReservationCoordinator Durable Object.
 *
 * Mock the DurableObject base class and DurableObjectStorage for testing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReservationCoordinator } from '../reservation-do';
import type { Env } from '../auth';

/**
 * Create a mock DurableObjectStorage with in-memory Map.
 */
function createMockStorage(): DurableObjectStorage {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (keyOrKeys: string | string[]) => {
      if (Array.isArray(keyOrKeys)) {
        for (const k of keyOrKeys) {
          store.delete(k);
        }
        return keyOrKeys.length > 0;
      }
      return store.delete(keyOrKeys);
    }),
    list: vi.fn(async (opts?: { prefix?: string }) => {
      const result = new Map();
      for (const [k, v] of store) {
        if (!opts?.prefix || k.startsWith(opts.prefix)) {
          result.set(k, v);
        }
      }
      return result;
    }),
    // Internal test helper
    _store: store,
  } as unknown as DurableObjectStorage;
}

/**
 * Create mock DurableObjectState.
 */
function createMockState(): DurableObjectState {
  return {
    storage: createMockStorage(),
    id: { toString: () => 'singleton' } as DurableObjectId,
    waitUntil: vi.fn(),
    blockConcurrencyWhile: vi.fn(),
  } as unknown as DurableObjectState;
}

/**
 * Create a mock Env for DO tests.
 */
function createMockEnv(): Env {
  return {
    AUTH: {} as KVNamespace,
    DATA: {} as KVNamespace,
    RESERVATIONS: {} as DurableObjectNamespace,
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    JWT_SECRET: 'test-jwt-secret',
    MAINTAINER_USER_IDS: '',
    CALLBACK_URL: 'https://skillsets.cc/callback',
    SITE_URL: 'https://skillsets.cc',
  };
}

describe('ReservationCoordinator', () => {
  let coordinator: ReservationCoordinator;
  let mockState: DurableObjectState;
  let mockEnv: Env;

  beforeEach(() => {
    mockState = createMockState();
    mockEnv = createMockEnv();
    coordinator = new ReservationCoordinator(mockState, mockEnv);
  });

  describe('GET /status', () => {
    it('test_get_status_empty', async () => {
      const request = new Request('https://do/status');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      expect(data.totalGhostSlots).toBe(10);
      expect(data.userSlot).toBeNull();
      expect(Object.keys(data.slots)).toHaveLength(10);

      // All slots should be available
      for (let i = 1; i <= 10; i++) {
        const slotId = `ghost-${i}`;
        expect(data.slots[slotId].status).toBe('available');
      }
    });

    it('test_status_with_user_id', async () => {
      // Pre-populate a reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('slot:ghost-5', { userId: '123', expiresAt: now + 86400 });
      storage._store.set('user:123', 'ghost-5');

      const request = new Request('https://do/status', {
        headers: { 'X-User-Id': '123' },
      });
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      expect(data.userSlot).toBe('ghost-5');
      expect(data.slots['ghost-5'].status).toBe('reserved');
    });

    it('test_lazy_expiry', async () => {
      // Set an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('slot:ghost-3', { userId: '123', expiresAt: now - 60 });
      storage._store.set('user:123', 'ghost-3');

      const request = new Request('https://do/status');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      // Expired slot should show as available
      expect(data.slots['ghost-3'].status).toBe('available');
    });
  });

  describe('POST /reserve', () => {
    it('test_reserve_slot', async () => {
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-1', userId: '123' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(201);

      const data = await response.json() as any;
      expect(data.slotId).toBe('ghost-1');
      expect(data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify storage was updated
      const storage = mockState.storage as any;
      const slotData = storage._store.get('slot:ghost-1');
      expect(slotData).toBeDefined();
      expect(slotData.userId).toBe('123');

      const userSlot = storage._store.get('user:123');
      expect(userSlot).toBe('ghost-1');
    });

    it('test_reserve_duplicate_user', async () => {
      // Reserve ghost-1 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({ slotId: 'ghost-1', userId: '123' }),
        })
      );

      // Try to reserve ghost-2 as the same user
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-2', userId: '123' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json() as any;
      expect(data.error).toBe('user_has_reservation');
      expect(data.existingSlot).toBe('ghost-1');
    });

    it('test_reserve_taken_slot', async () => {
      // Reserve ghost-1 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({ slotId: 'ghost-1', userId: '123' }),
        })
      );

      // Try to reserve the same slot as user 456
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-1', userId: '456' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json() as any;
      expect(data.error).toBe('slot_taken');
    });

    it('test_reserve_invalid_slot', async () => {
      // Test ghost-0
      const request1 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-0', userId: '123' }),
      });
      const response1 = await coordinator.fetch(request1);
      expect(response1.status).toBe(404);

      const data1 = await response1.json() as any;
      expect(data1.error).toBe('slot_not_found');

      // Test ghost-11 (when totalGhostSlots=10)
      const request2 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-11', userId: '123' }),
      });
      const response2 = await coordinator.fetch(request2);
      expect(response2.status).toBe(404);

      // Test invalid format
      const request3 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'invalid', userId: '123' }),
      });
      const response3 = await coordinator.fetch(request3);
      expect(response3.status).toBe(404);
    });
  });

  describe('DELETE /release', () => {
    it('test_release_reservation', async () => {
      // Reserve ghost-3 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({ slotId: 'ghost-3', userId: '123' }),
        })
      );

      // Release the reservation
      const request = new Request('https://do/release', {
        method: 'DELETE',
        body: JSON.stringify({ userId: '123' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.released).toBe('ghost-3');

      // Verify storage was cleared
      const storage = mockState.storage as any;
      expect(storage._store.has('slot:ghost-3')).toBe(false);
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_release_no_reservation', async () => {
      const request = new Request('https://do/release', {
        method: 'DELETE',
        body: JSON.stringify({ userId: '999' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('no_reservation');
    });
  });

  describe('POST /config', () => {
    it('test_update_config', async () => {
      const request = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ ttlDays: 14 }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalGhostSlots).toBe(10);
      expect(data.ttlDays).toBe(14);
    });

    it('test_update_config_shrink_cleanup', async () => {
      // Reserve ghost-10
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({ slotId: 'ghost-10', userId: '123' }),
        })
      );

      // Shrink to 9 slots
      const request = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 9 }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      // Verify ghost-10 reservation was cleaned up
      const storage = mockState.storage as any;
      expect(storage._store.has('slot:ghost-10')).toBe(false);
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_update_config_bounds', async () => {
      // Test totalGhostSlots too high
      const request1 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 101 }),
      });
      const response1 = await coordinator.fetch(request1);
      expect(response1.status).toBe(400);

      // Test ttlDays = 0
      const request2 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ ttlDays: 0 }),
      });
      const response2 = await coordinator.fetch(request2);
      expect(response2.status).toBe(400);

      // Test ttlDays too high
      const request3 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ ttlDays: 31 }),
      });
      const response3 = await coordinator.fetch(request3);
      expect(response3.status).toBe(400);
    });
  });
});
