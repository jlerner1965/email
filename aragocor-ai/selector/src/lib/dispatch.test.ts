import { describe, expect, it, vi } from 'vitest';
import {
  FORM_NAME,
  createDispatcher,
  encodeBody,
  extractError,
  networkErrorMessage,
} from './dispatch';
import type { SampleRequestPayload } from '../types';

const PAYLOAD: SampleRequestPayload = {
  trackingId: 'RFQ-AGM-123456',
  raisedAt: '2026-08-16T00:00:00.000Z',
  source: 'Aragocor Minerals technical grade selector',
  page: 'https://aragocorminerals.com/',
  company: 'Toledo Glassworks',
  email: 'batch@toledoglassworks.com',
  shippingAddress: '1400 Industrial Pkwy, Toledo, OH 43605, USA',
  industry: 'Glass Manufacturing',
  process: 'Container glass batch',
  gradeCode: 'AGM-GLS-100',
  particleSize: '100 Mesh (150 µm)',
  micron: 150,
  purity: '97.0 – 98.0% CaCO₃',
  omri: 'not-applicable',
  notes: '',
};

/** In-memory stand-in for localStorage. */
function fakeStorage(): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

function okResponse(): Response {
  return new Response('{}', { status: 200 });
}

describe('encodeBody', () => {
  it('json mode carries the payload plus a Formspree subject', () => {
    const { body, contentType } = encodeBody(PAYLOAD, 'json', FORM_NAME);
    expect(contentType).toBe('application/json');
    const parsed = JSON.parse(body);
    expect(parsed.trackingId).toBe('RFQ-AGM-123456');
    expect(parsed.micron).toBe(150);
    expect(parsed._subject).toBe('RFQ-AGM-123456 · sample kit · AGM-GLS-100');
  });

  it('netlify mode form-encodes with form-name and no subject', () => {
    const { body, contentType } = encodeBody(PAYLOAD, 'netlify', FORM_NAME);
    expect(contentType).toBe('application/x-www-form-urlencoded');
    const params = new URLSearchParams(body);
    expect(params.get('form-name')).toBe(FORM_NAME);
    expect(params.get('company')).toBe('Toledo Glassworks');
    expect(params.get('micron')).toBe('150');
    expect(params.get('_subject')).toBeNull();
  });
});

describe('extractError', () => {
  it('prefers the endpoint error field', async () => {
    const res = new Response('{"error":"Form disabled"}', { status: 403 });
    expect(await extractError(res)).toBe('Form disabled');
  });

  it('joins an errors array', async () => {
    const res = new Response('{"errors":[{"message":"Bad email"},{"message":"No file"}]}', {
      status: 422,
    });
    expect(await extractError(res)).toBe('Bad email; No file');
  });

  it('falls back to the HTTP status with short body text', async () => {
    const res = new Response('nope', { status: 500 });
    expect(await extractError(res)).toBe('HTTP 500 — nope');
  });
});

describe('networkErrorMessage', () => {
  it('translates the opaque fetch failure', () => {
    expect(networkErrorMessage(new TypeError('Failed to fetch'))).toMatch(/CORS/);
    expect(networkErrorMessage(new Error('timeout'))).toBe('timeout');
  });
});

describe('createDispatcher.submit', () => {
  it('persists before posting, then marks sent', async () => {
    const storage = fakeStorage();
    const seen: string[] = [];
    let wireBody = '';
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      // The record must already be in storage when the network runs.
      seen.push(storage.data.get('aragocor.selector.v1') ?? '');
      wireBody = String(init?.body ?? '');
      return okResponse();
    });

    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });
    await dispatcher.submit(PAYLOAD);

    expect(seen[0]).toContain('RFQ-AGM-123456');
    expect(seen[0]).toContain('"pending"');
    // Queue bookkeeping stays out of the wire payload.
    const sent = JSON.parse(wireBody);
    expect(sent.status).toBeUndefined();
    expect(sent.tries).toBeUndefined();
    expect(sent.trackingId).toBe('RFQ-AGM-123456');
    const [record] = dispatcher.queue();
    expect(record?.status).toBe('sent');
    expect(record?.sentAt).toBeTruthy();
  });

  it('rejects with the endpoint message and keeps the failed record', async () => {
    const storage = fakeStorage();
    const fetchFn = vi.fn(async () => new Response('{"error":"Quota exceeded"}', { status: 429 }));
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    await expect(dispatcher.submit(PAYLOAD)).rejects.toThrow(/Quota exceeded.*RFQ-AGM-123456/);
    const [record] = dispatcher.queue();
    expect(record?.status).toBe('failed');
    expect(record?.tries).toBe(1);
  });

  it('replaces the failed record on a retry of the same tracking ID', async () => {
    const storage = fakeStorage();
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? new Response('{"error":"warming up"}', { status: 500 }) : okResponse();
    });
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    await expect(dispatcher.submit(PAYLOAD)).rejects.toThrow();
    await dispatcher.submit(PAYLOAD); // same tracking ID — a retry

    expect(dispatcher.queue()).toHaveLength(1);
    expect(dispatcher.queue()[0]?.status).toBe('sent');
    // Nothing left for flushQueue to duplicate.
    expect(await dispatcher.flushQueue()).toBe(0);
  });

  it('turns a network failure into an actionable rejection', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const dispatcher = createDispatcher({
      endpoint: 'https://x.test/f',
      fetchFn,
      storage: fakeStorage(),
    });
    await expect(dispatcher.submit(PAYLOAD)).rejects.toThrow(/CORS/);
  });
});

describe('createDispatcher.flushQueue', () => {
  it('re-sends failed records left by a previous session', async () => {
    const storage = fakeStorage();
    storage.setItem(
      'aragocor.selector.v1',
      JSON.stringify([{ ...PAYLOAD, status: 'failed', tries: 2, error: 'HTTP 500' }]),
    );

    const fetchFn = vi.fn(async () => okResponse());
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    expect(await dispatcher.flushQueue()).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(dispatcher.queue()[0]?.status).toBe('sent');
  });

  it('gives up after five attempts', async () => {
    const storage = fakeStorage();
    storage.setItem(
      'aragocor.selector.v1',
      JSON.stringify([{ ...PAYLOAD, status: 'failed', tries: 5, error: 'HTTP 500' }]),
    );

    const fetchFn = vi.fn(async () => okResponse());
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    expect(await dispatcher.flushQueue()).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('ignores records that already went out', async () => {
    const storage = fakeStorage();
    storage.setItem(
      'aragocor.selector.v1',
      JSON.stringify([{ ...PAYLOAD, status: 'sent', tries: 0, error: '' }]),
    );

    const fetchFn = vi.fn(async () => okResponse());
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    expect(await dispatcher.flushQueue()).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('queue hygiene', () => {
  it('prunes old sent records but never pending or failed ones', async () => {
    const storage = fakeStorage();
    const old: object[] = [];
    for (let i = 0; i < 25; i++) {
      old.push({ ...PAYLOAD, trackingId: `RFQ-AGM-6000${i}`, status: 'sent', tries: 0, error: '' });
    }
    old.push({ ...PAYLOAD, trackingId: 'RFQ-AGM-700001', status: 'failed', tries: 5, error: 'x' });
    storage.setItem('aragocor.selector.v1', JSON.stringify(old));

    const fetchFn = vi.fn(async () => okResponse());
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });
    await dispatcher.submit(PAYLOAD); // triggers a pruned write

    const queue = dispatcher.queue();
    expect(queue.filter((r) => r.status === 'sent')).toHaveLength(20);
    // The exhausted failed record survives pruning — it is still owed.
    expect(queue.some((r) => r.trackingId === 'RFQ-AGM-700001')).toBe(true);
  });

  it('does not double-send a record two flushes race over', async () => {
    const storage = fakeStorage();
    storage.setItem(
      'aragocor.selector.v1',
      JSON.stringify([{ ...PAYLOAD, status: 'failed', tries: 1, error: 'HTTP 500' }]),
    );

    let resolveFetch: (r: Response) => void = () => {};
    const fetchFn = vi.fn(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    // Two flushes in flight at once — StrictMode's double effect.
    const first = dispatcher.flushQueue();
    const second = dispatcher.flushQueue();
    resolveFetch(okResponse());
    await Promise.all([first, second]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(dispatcher.queue()[0]?.status).toBe('sent');
  });
});

describe('storage resilience', () => {
  it('keeps working in memory when storage throws', async () => {
    const storage: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const fetchFn = vi.fn(async () => okResponse());
    const dispatcher = createDispatcher({ endpoint: 'https://x.test/f', fetchFn, storage });

    await dispatcher.submit(PAYLOAD);
    expect(dispatcher.queue()[0]?.status).toBe('sent');
  });
});
