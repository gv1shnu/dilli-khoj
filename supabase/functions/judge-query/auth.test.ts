import { createHmac, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('postgres', () => ({ default: () => query }));
import judge from './index';

const secret = randomBytes(32);
const player = '00000000-0000-4000-8000-000000000001';
function token(claims: Record<string, unknown> = {}, signingKey = secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: 'local-test' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: player, role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60, app_metadata: { provider: 'google' }, ...claims })).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
function request(jwt?: string) {
  return new Request('http://localhost/judge-query', { method: 'POST',
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {}, body: '{}' });
}
beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_local_test');
  vi.stubEnv('SUPABASE_JWKS', JSON.stringify({ keys: [{ kty: 'oct', alg: 'HS256', kid: 'local-test', k: secret.toString('base64url') }] }));
  vi.stubGlobal('Deno', { env: { get: (name: string) => name.startsWith('JUDGE_') ? 'postgres://local-test' : process.env[name] } });
  query.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('judge request authentication boundary', () => {
  it.each([
    ['absent', () => undefined], ['expired', () => token({ exp: 1 })],
    ['forged', () => token({}, randomBytes(32))], ['malformed', () => 'invalid'],
  ])('rejects %s JWT before touching the database', async (_name, jwt) => {
    expect((await judge.fetch(request(jwt()))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects a non-Google JWT before touching the database', async () => {
    expect((await judge.fetch(request(token({ app_metadata: { provider: 'email' } })))).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects disallowed identities before parsing the submission or loading fixtures', async () => {
    query.mockResolvedValue([{ approved: false }]);
    expect((await judge.fetch(request(token()))).status).toBe(403);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].join('')).toContain('game_private.is_approved_player');
    expect(query.mock.calls[0][1]).toBe(player);
  });
  it('fails closed on database authorization failure', async () => {
    query.mockRejectedValue(new Error('unavailable'));
    expect((await judge.fetch(request(token()))).status).toBe(503);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('allows an approved identity to reach submission validation', async () => {
    query.mockResolvedValue([{ approved: true }]);
    const response = await judge.fetch(request(token()));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('submission_id must be a UUID.');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
