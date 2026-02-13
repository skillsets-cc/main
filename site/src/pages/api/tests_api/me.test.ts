import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext } from '../../../lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

import { GET } from '../me';
import { getSessionFromRequest } from '@/lib/auth';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_401_when_no_session', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('test_returns_401_when_jwt_invalid', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', {
        headers: { Cookie: 'session=invalid-token' },
      })
    );
    const response = await GET(ctx);

    expect(response.status).toBe(401);
  });

  it('test_returns_login_when_session_valid', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ login: 'testuser' });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
