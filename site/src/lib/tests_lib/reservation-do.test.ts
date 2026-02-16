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
      expect(data.cohort).toBe(1);
      expect(data.userSlot).toBeNull();
      expect(Object.keys(data.slots)).toHaveLength(10);

      // All slots should be available with batch ID format
      for (let i = 1; i <= 10; i++) {
        const batchId = `${i}.10.001`;
        expect(data.slots[batchId].status).toBe('available');
      }
    });

    it('test_status_with_user_id', async () => {
      // Pre-populate a reservation with new format
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:5.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'testuser',
        expiresAt: now + 86400,
      });
      storage._store.set('user:123', '5.10.001');

      const request = new Request('https://do/status', {
        headers: { 'X-User-Id': '123' },
      });
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      expect(data.userSlot).toBe('5.10.001');
      expect(data.slots['5.10.001'].status).toBe('reserved');
    });

    it('test_lazy_expiry_no_delete', async () => {
      // Set an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:3.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'testuser',
        expiresAt: now - 60,
      });
      storage._store.set('user:123', '3.10.001');

      const request = new Request('https://do/status');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      // Expired slot should show as available
      expect(data.slots['3.10.001'].status).toBe('available');

      // BUT storage still contains the entry (lazy expiry)
      expect(storage._store.has('batch:3.10.001')).toBe(true);
    });

    it('test_status_submitted_slot', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });

      const request = new Request('https://do/status');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      expect(data.slots['5.10.001'].status).toBe('submitted');
      expect(data.slots['5.10.001'].skillsetId).toBe('@user/Skill');
    });

    it('test_status_submitted_old_cohort', async () => {
      // Set config to cohort 2
      const storage = mockState.storage as any;
      storage._store.set('config', {
        totalGhostSlots: 10,
        ttlDays: 7,
        cohort: 2,
      });

      // Pre-populate a submitted slot from cohort 1
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });

      const request = new Request('https://do/status');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json() as any;

      // Old cohort submitted slot should appear
      expect(data.slots['5.10.001']).toBeDefined();
      expect(data.slots['5.10.001'].status).toBe('submitted');

      // Current cohort slots should also be there
      expect(data.slots['1.10.002']).toBeDefined();
      expect(data.slots['1.10.002'].status).toBe('available');
    });
  });

  describe('POST /reserve', () => {
    it('test_reserve_slot', async () => {
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '1.10.001',
          userId: '123',
          githubLogin: 'testuser',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(201);

      const data = await response.json() as any;
      expect(data.batchId).toBe('1.10.001');
      expect(data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify storage was updated with new format
      const storage = mockState.storage as any;
      const slotData = storage._store.get('batch:1.10.001');
      expect(slotData).toBeDefined();
      expect(slotData.status).toBe('reserved');
      expect(slotData.userId).toBe('123');
      expect(slotData.githubLogin).toBe('testuser');

      const userSlot = storage._store.get('user:123');
      expect(userSlot).toBe('1.10.001');
    });

    it('test_reserve_duplicate_user', async () => {
      // Reserve 1.10.001 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '1.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      // Try to reserve 2.10.001 as the same user
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '2.10.001',
          userId: '123',
          githubLogin: 'testuser',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json() as any;
      expect(data.error).toBe('user_has_reservation');
      expect(data.existingSlot).toBe('1.10.001');
    });

    it('test_reserve_taken_slot', async () => {
      // Reserve 1.10.001 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '1.10.001',
            userId: '123',
            githubLogin: 'user123',
          }),
        })
      );

      // Try to reserve the same slot as user 456
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '1.10.001',
          userId: '456',
          githubLogin: 'user456',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json() as any;
      expect(data.error).toBe('slot_taken');
    });

    it('test_reserve_invalid_slot', async () => {
      // Test invalid format
      const request1 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: 'invalid',
          userId: '123',
          githubLogin: 'testuser',
        }),
      });
      const response1 = await coordinator.fetch(request1);
      expect(response1.status).toBe(404);

      // Test wrong cohort
      const request2 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '1.10.002',
          userId: '123',
          githubLogin: 'testuser',
        }),
      });
      const response2 = await coordinator.fetch(request2);
      expect(response2.status).toBe(404);

      // Test position > batch size
      const request3 = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '11.10.001',
          userId: '123',
          githubLogin: 'testuser',
        }),
      });
      const response3 = await coordinator.fetch(request3);
      expect(response3.status).toBe(404);
    });

    it('test_reserve_expired_overwrite', async () => {
      // Pre-populate an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:1.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'olduser',
        expiresAt: now - 60,
      });
      storage._store.set('user:123', '1.10.001');

      // Reserve same slot as new user
      const request = new Request('https://do/reserve', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '1.10.001',
          userId: '456',
          githubLogin: 'newuser',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(201);

      // Verify old data was overwritten
      const slotData = storage._store.get('batch:1.10.001');
      expect(slotData.userId).toBe('456');
      expect(slotData.githubLogin).toBe('newuser');
    });
  });

  describe('DELETE /release', () => {
    it('test_release_reservation', async () => {
      // Reserve 3.10.001 as user 123
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '3.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
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
      expect(data.released).toBe('3.10.001');

      // Verify storage was cleared
      const storage = mockState.storage as any;
      expect(storage._store.has('batch:3.10.001')).toBe(false);
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_release_submitted_slot', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });
      storage._store.set('user:123', '5.10.001');

      // Try to release
      const request = new Request('https://do/release', {
        method: 'DELETE',
        body: JSON.stringify({ userId: '123' }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe('already_submitted');
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
      expect(data.cohort).toBe(1);
    });

    it('test_config_reject_batch_size_change_same_cohort', async () => {
      // Try to change totalGhostSlots without changing cohort
      const request = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 15 }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('Cannot change totalGhostSlots within a cohort');
    });

    it('test_config_cohort_change_wipes_reserved', async () => {
      // Reserve a slot
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '1.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      // Change cohort
      const request = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 2, totalGhostSlots: 15 }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      // Verify reserved slot was deleted
      const storage = mockState.storage as any;
      expect(storage._store.has('batch:1.10.001')).toBe(false);
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_config_cohort_change_preserves_submitted', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });
      storage._store.set('user:123', '5.10.001');

      // Change cohort
      const request = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 2, totalGhostSlots: 15 }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      // Verify submitted slot data still exists
      expect(storage._store.has('batch:5.10.001')).toBe(true);
      const slotData = storage._store.get('batch:5.10.001');
      expect(slotData.status).toBe('submitted');

      // Verify user key IS deleted (user can reserve in new cohort)
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_config_cohort_validation', async () => {
      // cohort 0
      const request1 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 0 }),
      });
      const response1 = await coordinator.fetch(request1);
      expect(response1.status).toBe(400);

      // cohort 1000
      const request2 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 1000 }),
      });
      const response2 = await coordinator.fetch(request2);
      expect(response2.status).toBe(400);
    });

    it('test_update_config_bounds', async () => {
      // Test totalGhostSlots too high
      const request1 = new Request('https://do/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 101, cohort: 2 }),
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

  describe('GET /verify', () => {
    it('test_verify_valid_reservation_by_login', async () => {
      // Reserve a slot
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      const request = new Request('https://do/verify?batchId=5.10.001&login=testuser');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.batchId).toBe('5.10.001');
    });

    it('test_verify_valid_reservation_by_user_id', async () => {
      // Reserve a slot
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      const request = new Request('https://do/verify?batchId=5.10.001&userId=123');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    it('test_verify_login_mismatch', async () => {
      // Reserve with login 'alice'
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'alice',
          }),
        })
      );

      // Verify with login 'bob'
      const request = new Request('https://do/verify?batchId=5.10.001&login=bob');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('login_mismatch');
    });

    it('test_verify_not_reserved', async () => {
      const request = new Request('https://do/verify?batchId=5.10.001&login=testuser');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('not_reserved');
    });

    it('test_verify_already_submitted', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });

      const request = new Request('https://do/verify?batchId=5.10.001&login=testuser');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('already_submitted');
    });

    it('test_verify_expired', async () => {
      // Pre-populate an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:5.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'testuser',
        expiresAt: now - 60,
      });

      const request = new Request('https://do/verify?batchId=5.10.001&login=testuser');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('not_reserved');
    });

    it('test_verify_invalid_batch_id', async () => {
      const request = new Request('https://do/verify?batchId=invalid&login=testuser');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.reason).toBe('invalid_batch_id');
    });
  });

  describe('POST /submit', () => {
    it('test_submit_valid', async () => {
      // Reserve a slot
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      // Submit the slot
      const request = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: '@user/Skill',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.batchId).toBe('5.10.001');
      expect(data.status).toBe('submitted');
      expect(data.skillsetId).toBe('@user/Skill');

      // Verify storage has submitted data
      const storage = mockState.storage as any;
      const slotData = storage._store.get('batch:5.10.001');
      expect(slotData.status).toBe('submitted');
      expect(slotData.skillsetId).toBe('@user/Skill');

      // Verify user key was deleted
      expect(storage._store.has('user:123')).toBe(false);
    });

    it('test_submit_not_reserved', async () => {
      const request = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: '@user/Skill',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('not_reserved');
    });

    it('test_submit_already_submitted', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });

      const request = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: '@user/NewSkill',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toBe('already_submitted');
    });

    it('test_submit_invalid_batch_id', async () => {
      const request = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: 'bad',
          skillsetId: '@user/Skill',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(400);
    });

    it('test_submit_invalid_skillset_id', async () => {
      // Reserve a slot first
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      // Test no @ sign
      const request1 = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: 'no-at-sign',
        }),
      });
      const response1 = await coordinator.fetch(request1);
      expect(response1.status).toBe(400);

      // Test too long (> 200 chars)
      const longId = '@user/' + 'x'.repeat(200);
      const request2 = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: longId,
        }),
      });
      const response2 = await coordinator.fetch(request2);
      expect(response2.status).toBe(400);
    });

    it('test_submit_after_expiry', async () => {
      // Pre-populate an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:5.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'testuser',
        expiresAt: now - 60,
      });

      // Submit should still succeed (maintainer is authoritative)
      const request = new Request('https://do/submit', {
        method: 'POST',
        body: JSON.stringify({
          batchId: '5.10.001',
          skillsetId: '@user/Skill',
        }),
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(200);
    });

    it('test_submit_invalid_json', async () => {
      const request = new Request('https://do/submit', {
        method: 'POST',
        body: 'not json',
      });

      const response = await coordinator.fetch(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('invalid_body');
    });
  });

  describe('GET /lookup', () => {
    it('test_lookup_active_reservation', async () => {
      // Reserve a slot
      await coordinator.fetch(
        new Request('https://do/reserve', {
          method: 'POST',
          body: JSON.stringify({
            batchId: '5.10.001',
            userId: '123',
            githubLogin: 'testuser',
          }),
        })
      );

      const request = new Request('https://do/lookup?githubId=123');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBe('5.10.001');
    });

    it('test_lookup_no_reservation', async () => {
      const request = new Request('https://do/lookup?githubId=999');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBeNull();
    });

    it('test_lookup_submitted_returns_null', async () => {
      // Pre-populate a submitted slot
      const storage = mockState.storage as any;
      storage._store.set('batch:5.10.001', {
        status: 'submitted',
        userId: '123',
        githubLogin: 'testuser',
        skillsetId: '@user/Skill',
        submittedAt: 1000,
      });
      storage._store.set('user:123', '5.10.001');

      const request = new Request('https://do/lookup?githubId=123');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBeNull();
    });

    it('test_lookup_expired_returns_null', async () => {
      // Pre-populate an expired reservation
      const storage = mockState.storage as any;
      const now = Math.floor(Date.now() / 1000);
      storage._store.set('batch:5.10.001', {
        status: 'reserved',
        userId: '123',
        githubLogin: 'testuser',
        expiresAt: now - 60,
      });
      storage._store.set('user:123', '5.10.001');

      const request = new Request('https://do/lookup?githubId=123');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBeNull();
    });

    it('test_lookup_missing_param', async () => {
      const request = new Request('https://do/lookup');
      const response = await coordinator.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBeNull();
    });
  });
});
