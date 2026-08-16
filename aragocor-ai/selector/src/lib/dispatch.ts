/* dispatch.ts — where a completed sample request actually goes.
 *
 * The order mirrors save() in ../../js/rfq.js and is deliberate:
 *
 *   1. Write the request to storage, status pending.
 *   2. POST it to the endpoint.
 *   3. Mark it sent or failed.
 *
 * Because step 1 happens first, a dead network or a closed tab cannot
 * lose a lead. Anything still pending or failed goes out again on the
 * next load, up to five attempts — same policy as the sourcing desk.
 *
 * Two endpoint modes, matching the desk's settings:
 *   json    — fetch POST of the payload as JSON (Formspree, Getform,
 *             or your own handler; it must send CORS headers).
 *   netlify — form-encoded POST to the site root. Deploy
 *             netlify-sample.html alongside the site so Netlify
 *             registers the field list at build time. */

import type { SampleRequestPayload } from '../types';

export type DispatchMode = 'json' | 'netlify';

export interface DispatchConfig {
  readonly endpoint: string;
  readonly mode?: DispatchMode;
  /** Netlify form name. Must match the hidden form in netlify-sample.html. */
  readonly formName?: string;
  /** Injectable for tests. Defaults to window.fetch. */
  readonly fetchFn?: typeof fetch;
  /** Injectable for tests. Defaults to window.localStorage. */
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export interface QueueRecord extends SampleRequestPayload {
  status: 'pending' | 'sent' | 'failed';
  tries: number;
  error: string;
  sentAt?: string;
}

export interface Dispatcher {
  /** The onSubmit for <MineralSelector/>. Persists first, then posts.
   *  Rejects with a user-facing message when the endpoint refuses. */
  readonly submit: (payload: SampleRequestPayload) => Promise<void>;
  /** Re-sends anything a previous session left pending or failed.
   *  Call once on mount. Resolves with how many went out. */
  readonly flushQueue: () => Promise<number>;
  /** Current queue, newest first. For diagnostics and tests. */
  readonly queue: () => readonly QueueRecord[];
}

export const FORM_NAME = 'aragocor-sample-kit';
const STORAGE_KEY = 'aragocor.selector.v1';
const MAX_TRIES = 5;
/** Sent records kept as history; older ones are pruned so the queue
 *  cannot grow without bound in a long-lived browser profile. */
const MAX_SENT_KEPT = 20;

/* ── the queue ─────────────────────────────────────────────────
   One versioned key, an in-memory fallback when storage is blocked
   (private mode, sandboxed iframes) — same posture as
   ../../js/storage.js. Nothing else touches localStorage. */

interface Queue {
  read: () => QueueRecord[];
  write: (records: QueueRecord[]) => void;
}

function makeQueue(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined): Queue {
  let mem: QueueRecord[] | null = null;
  let usable = true;

  function backing(): Pick<Storage, 'getItem' | 'setItem'> | null {
    if (storage) return storage;
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  return {
    read() {
      if (mem) return mem;
      const store = backing();
      if (store) {
        try {
          const raw = store.getItem(STORAGE_KEY);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            mem = Array.isArray(parsed) ? (parsed as QueueRecord[]) : [];
            return mem;
          }
        } catch {
          usable = false; // blocked or corrupt — carry on in memory
        }
      }
      mem = [];
      return mem;
    },
    write(records) {
      mem = records;
      if (!usable) return;
      const store = backing();
      if (!store) return;
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch {
        usable = false;
      }
    },
  };
}

/* ── wire formats ──────────────────────────────────────────────── */

function urlencode(obj: Record<string, string>): string {
  return Object.keys(obj)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k] ?? '')}`)
    .join('&');
}

/** Flatten the payload to strings for form encoding. */
function flatten(payload: SampleRequestPayload): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    out[key] = String(value);
  }
  return out;
}

/** Formspree reads _subject as the notification subject line. The desk
 *  does the same; Netlify mode drops it because the field is not
 *  registered on the hidden form. */
function subjectFor(payload: SampleRequestPayload): string {
  return `${payload.trackingId} · sample kit · ${payload.gradeCode}`;
}

export function encodeBody(
  payload: SampleRequestPayload,
  mode: DispatchMode,
  formName: string,
): { body: string; contentType: string } {
  // The honeypot ships under the endpoint's own spam-discard field,
  // never under its internal name. Records queued before the honeypot
  // existed lack the key — treat them as human.
  const { honeypot = '', ...wire } = payload as SampleRequestPayload & { honeypot?: string };

  if (mode === 'netlify') {
    const flat = flatten(wire as SampleRequestPayload);
    flat['form-name'] = formName;
    flat['bot-field'] = honeypot;
    return { body: urlencode(flat), contentType: 'application/x-www-form-urlencoded' };
  }
  return {
    body: JSON.stringify({
      ...wire,
      _subject: subjectFor(payload),
      ...(honeypot ? { _gotcha: honeypot } : {}),
    }),
    contentType: 'application/json',
  };
}

/** Same message extraction as post() in ../../js/rfq.js: prefer the
 *  endpoint's own error text, fall back to the HTTP status, and turn
 *  the browser's opaque 'Failed to fetch' into something actionable. */
export async function extractError(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  const text = await res.text().catch(() => '');
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const j = parsed as { error?: unknown; errors?: unknown };
      if (typeof j.error === 'string' && j.error) return j.error;
      if (Array.isArray(j.errors) && j.errors.length) {
        return j.errors
          .map((e: unknown) =>
            e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e),
          )
          .join('; ');
      }
    }
  } catch {
    if (text && text.length < 160) message += ` — ${text}`;
  }
  return message;
}

export function networkErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw === 'Failed to fetch'
    ? 'Could not reach the endpoint — check the URL and its CORS settings.'
    : raw;
}

/* ── the dispatcher ────────────────────────────────────────────── */

export function createDispatcher(config: DispatchConfig): Dispatcher {
  const endpoint = config.endpoint.trim();
  const mode: DispatchMode = config.mode ?? 'json';
  const formName = config.formName ?? FORM_NAME;
  const fetchFn = config.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const queue = makeQueue(config.storage);

  /** Tracking IDs with a POST currently in the air. Guards against a
   *  doubled flushQueue (React StrictMode mounts effects twice) or a
   *  flush racing a submit sending the same lead twice. */
  const inFlight = new Set<string>();

  /** Pending and failed records are never dropped — they are owed to
   *  the desk. Sent records are history, capped at MAX_SENT_KEPT. */
  function prune(records: QueueRecord[]): QueueRecord[] {
    let sentSeen = 0;
    return records.filter((record) => {
      if (record.status !== 'sent') return true;
      sentSeen += 1;
      return sentSeen <= MAX_SENT_KEPT;
    });
  }

  function update(trackingId: string, patch: Partial<QueueRecord>): void {
    queue.write(
      prune(
        queue
          .read()
          .map((record) => (record.trackingId === trackingId ? { ...record, ...patch } : record)),
      ),
    );
  }

  /** Never rejects — the caller always gets a status to store. */
  async function post(payload: SampleRequestPayload): Promise<{ ok: boolean; error?: string }> {
    const { body, contentType } = encodeBody(payload, mode, formName);
    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers:
          mode === 'netlify'
            ? { 'Content-Type': contentType }
            : { 'Content-Type': contentType, Accept: 'application/json' },
        body,
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: await extractError(res) };
    } catch (err) {
      return { ok: false, error: networkErrorMessage(err) };
    }
  }

  /** Queue bookkeeping stays local — the endpoint gets the payload the
   *  desk's pipeline expects, nothing more. */
  function toPayload(record: QueueRecord): SampleRequestPayload {
    const { status, tries, error, sentAt, ...payload } = record;
    void status;
    void tries;
    void error;
    void sentAt;
    return payload;
  }

  async function deliver(record: QueueRecord): Promise<{ ok: boolean; error?: string }> {
    if (inFlight.has(record.trackingId)) return { ok: true }; // already going out
    inFlight.add(record.trackingId);
    try {
      const out = await post(toPayload(record));
      if (out.ok) {
        update(record.trackingId, { status: 'sent', error: '', sentAt: new Date().toISOString() });
      } else {
        update(record.trackingId, {
          status: 'failed',
          error: out.error ?? 'Unknown error',
          tries: record.tries + 1,
        });
      }
      return out;
    } finally {
      inFlight.delete(record.trackingId);
    }
  }

  return {
    async submit(payload) {
      // Step 1: the lead exists before the network gets a say. A retry
      // of the same tracking ID replaces its record rather than adding
      // a duplicate, so a failed first attempt doesn't also go out
      // later via flushQueue as a second lead.
      const existing = queue.read().find((r) => r.trackingId === payload.trackingId);
      const record: QueueRecord = {
        ...payload,
        status: 'pending',
        tries: existing?.tries ?? 0,
        error: '',
      };
      queue.write(
        prune([record, ...queue.read().filter((r) => r.trackingId !== payload.trackingId)]),
      );

      // Steps 2 and 3: post, then mark.
      const out = await deliver(record);
      if (!out.ok) {
        throw new Error(
          `${out.error ?? 'The request could not be sent.'} Your request is saved as ${payload.trackingId} and will be retried.`,
        );
      }
    },

    async flushQueue() {
      const stuck = queue
        .read()
        .filter((r) => (r.status === 'pending' || r.status === 'failed') && r.tries < MAX_TRIES);
      await Promise.all(stuck.map((record) => deliver(record)));
      return stuck.length;
    },

    queue: () => queue.read(),
  };
}
