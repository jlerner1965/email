/* config.ts — where the lead endpoint comes from.
 *
 * Two sources, in order:
 *
 *   1. Build-time env (VITE_RFQ_ENDPOINT / VITE_RFQ_MODE) — wins when
 *      set, for deployments that manage config through their host.
 *   2. rfq-config.json, fetched at runtime from the deploy itself —
 *      the file lives in public/, ships with every build, and can be
 *      edited in the repo with no dashboard access and no rebuild
 *      beyond the push-triggered deploy.
 *
 * Neither configured → null, and the widget runs its simulated
 * dispatch. A missing or malformed config file is treated the same
 * way rather than breaking the page. */

import type { DispatchMode } from './dispatch';

export interface RfqConfig {
  readonly endpoint: string;
  readonly mode: DispatchMode;
}

function normalizeMode(raw: unknown): DispatchMode {
  return raw === 'netlify' ? 'netlify' : 'json';
}

/** Parse the runtime config file's JSON. Exported for tests. */
export function parseRfqConfig(raw: unknown): RfqConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { endpoint?: unknown; mode?: unknown };
  const endpoint = typeof candidate.endpoint === 'string' ? candidate.endpoint.trim() : '';
  if (!endpoint) return null;
  return { endpoint, mode: normalizeMode(candidate.mode) };
}

export function envConfig(): RfqConfig | null {
  const endpoint = (import.meta.env.VITE_RFQ_ENDPOINT as string | undefined)?.trim();
  if (!endpoint) return null;
  return {
    endpoint,
    mode: normalizeMode((import.meta.env.VITE_RFQ_MODE as string | undefined)?.trim()),
  };
}

/** Resolve the effective config: env first, then rfq-config.json.
 *  Never rejects — configuration problems mean simulated dispatch,
 *  not a broken landing page. */
export async function resolveRfqConfig(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): Promise<RfqConfig | null> {
  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;

  try {
    // BASE_URL-relative so the file is found wherever the build is
    // mounted. The widget is a single page, so relative resolution
    // against the page URL is safe.
    const res = await fetchFn(`${import.meta.env.BASE_URL}rfq-config.json`, {
      cache: 'no-cache',
    });
    if (!res.ok) return null;
    return parseRfqConfig(await res.json());
  } catch {
    return null;
  }
}
