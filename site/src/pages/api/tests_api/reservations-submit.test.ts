import { describe, it, expect, vi } from 'vitest';
import { createAPIContext, createMockStub } from '../../../lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { POST } from '../reservations/submit';
import { getSessionFromRequest } from '@/lib/auth';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;
const mockGetStub = getReservationStub as ReturnType<typeof vi.fn>;

describe('POST /api/reservations/submit', () => {
  it('test_submit_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(401);
  });

  it('test_submit_not_maintainer', async () => {
    mockGetSession.mockResolvedValue({ userId: '999', login: 'test', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('test_submit_valid', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({
      status: 200,
      body: { batchId: '5.10.001', status: 'submitted', skillsetId: '@user/Skill' },
    });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.batchId).toBe('5.10.001');
    expect(data.status).toBe('submitted');
    expect(data.skillsetId).toBe('@user/Skill');
  });

  it('test_submit_do_404', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 404, body: { error: 'not_reserved' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('not_reserved');
  });

  it('test_submit_do_409', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 409, body: { error: 'already_submitted' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('already_submitted');
  });

  it('test_submit_invalid_json', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
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

  it('test_submit_invalid_batch_id_format', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: 'invalid', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid batch ID');
  });

  it('test_submit_missing_batch_id', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid batch ID');
  });

  it('test_submit_invalid_skillset_id_format', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: 'invalid/../../etc' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid skillset ID');
  });

  it('test_submit_missing_skillset_id', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid skillset ID');
  });
});
