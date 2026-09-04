import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./lib/supabase', () => ({ supabase: null, signInWithGoogle: vi.fn() }));
import { App } from './App';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('blocks production without Supabase configuration before mounting the game', () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('DEV', false);
  vi.stubGlobal('window', { location: { hash: '' } });
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('Sign-in is not configured');
  expect(html).not.toContain('SQL challenge');
  expect(html).not.toContain('Continue for local development');
});
