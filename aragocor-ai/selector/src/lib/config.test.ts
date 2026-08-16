import { describe, expect, it, vi } from 'vitest';
import { parseRfqConfig, resolveRfqConfig } from './config';

describe('parseRfqConfig', () => {
  it('accepts a well-formed config', () => {
    expect(parseRfqConfig({ endpoint: 'https://formspree.io/f/abc', mode: 'json' })).toEqual({
      endpoint: 'https://formspree.io/f/abc',
      mode: 'json',
    });
  });

  it('trims the endpoint and defaults an unknown mode to json', () => {
    expect(parseRfqConfig({ endpoint: '  https://x.test/f  ', mode: 'carrier-pigeon' })).toEqual({
      endpoint: 'https://x.test/f',
      mode: 'json',
    });
  });

  it('keeps an explicit netlify mode', () => {
    expect(parseRfqConfig({ endpoint: '/', mode: 'netlify' })?.mode).toBe('netlify');
  });

  it('returns null for an empty endpoint — simulated dispatch, not a crash', () => {
    expect(parseRfqConfig({ endpoint: '', mode: 'json' })).toBeNull();
    expect(parseRfqConfig({ endpoint: '   ' })).toBeNull();
  });

  it('returns null for junk', () => {
    expect(parseRfqConfig(null)).toBeNull();
    expect(parseRfqConfig('endpoint')).toBeNull();
    expect(parseRfqConfig({ endpoint: 42 })).toBeNull();
    expect(parseRfqConfig([])).toBeNull();
  });
});

describe('resolveRfqConfig', () => {
  // Env is unset under vitest, so the runtime file is the source.
  it('reads rfq-config.json from the deploy', async () => {
    const fetchFn = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response('{"endpoint":"https://x.test/f","mode":"json"}', { status: 200 }),
    );
    expect(await resolveRfqConfig(fetchFn)).toEqual({ endpoint: 'https://x.test/f', mode: 'json' });
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('rfq-config.json');
  });

  it('returns null on a missing file', async () => {
    const fetchFn = vi.fn(async () => new Response('not found', { status: 404 }));
    expect(await resolveRfqConfig(fetchFn)).toBeNull();
  });

  it('returns null on malformed JSON rather than throwing', async () => {
    const fetchFn = vi.fn(async () => new Response('{oops', { status: 200 }));
    expect(await resolveRfqConfig(fetchFn)).toBeNull();
  });

  it('returns null on a network failure rather than throwing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await resolveRfqConfig(fetchFn)).toBeNull();
  });
});
