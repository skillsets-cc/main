import { describe, it, expect, vi } from 'vitest';
import { createAPIContext, createMockStub } from '../../../lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { POST } from '../reservations/config';
import { getSessionFromRequest } from '@/lib/auth';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;
const mockGetStub = getReservationStub as ReturnType<typeof vi.fn>;

describe('POST /api/reservations/config', () => {
  it('test_config_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 20 }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(401);
  });

  it('test_config_non_maintainer', async () => {
    mockGetSession.mockResolvedValue({ userId: '999', login: 'test', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 20 }),
      }),
      { MAINTAINER_USER_IDS: '123,456' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('test_config_maintainer_valid', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 200, body: { totalGhostSlots: 20, ttlDays: 7 } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 20 }),
      }),
      { MAINTAINER_USER_IDS: '123,456' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalGhostSlots).toBe(20);
  });

  it('test_config_maintainer_both_fields', async () => {
    mockGetSession.mockResolvedValue({ userId: '456', login: 'admin2', avatar: '' });
    const stub = createMockStub({ status: 200, body: { totalGhostSlots: 20, ttlDays: 14 } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 20, ttlDays: 14 }),
      }),
      { MAINTAINER_USER_IDS: '123,456' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalGhostSlots).toBe(20);
    expect(data.ttlDays).toBe(14);
  });

  it('test_config_invalid_type_totalGhostSlots', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ totalGhostSlots: 'abc' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('totalGhostSlots must be a number');
  });

  it('test_config_invalid_type_ttlDays', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ ttlDays: true }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('ttlDays must be a number');
  });

  it('test_config_invalid_json', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('test_config_maintainer_whitespace_handling', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 200, body: { totalGhostSlots: 24, ttlDays: 7 } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ ttlDays: 7 }),
      }),
      { MAINTAINER_USER_IDS: ' 123 , 456 ' }
    );
    const response = await POST(ctx);

    expect(response.status).toBe(200);
  });

  it('test_config_cohort_type_validation', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 'abc' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('cohort must be a number');
  });

  it('test_config_cohort_valid_passthrough', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 200, body: { totalGhostSlots: 15, ttlDays: 7, cohort: 2 } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/config', {
        method: 'POST',
        body: JSON.stringify({ cohort: 2, totalGhostSlots: 15 }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cohort).toBe(2);
    expect(data.totalGhostSlots).toBe(15);
  });
});
