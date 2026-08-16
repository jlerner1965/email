// @vitest-environment jsdom
/* MineralSelector.test.tsx — one integration test per behavior that
 * the pure-logic suites cannot see: the wiring between steps, the
 * submit hand-off, the honeypot, and the validation gate. Rendered
 * with real React against jsdom. */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MineralSelector } from './MineralSelector';
import type { SampleRequestPayload } from './types';

afterEach(cleanup);

/** Click through steps 1 and 2 for the Glass vertical. */
async function reachStepThree() {
  fireEvent.click(screen.getByRole('button', { name: /Glass Manufacturing/ }));
  // The industry hand-off holds the card lit briefly before advancing.
  await waitFor(() => screen.getByText('Process requirement and sizing'), { timeout: 2000 });
  fireEvent.click(screen.getByLabelText(/Container glass batch/));
  fireEvent.click(screen.getByRole('button', { name: /Generate technical preview/ }));
  await waitFor(() => screen.getByRole('heading', { name: /Your grade, and the sample kit/ }), {
    timeout: 2000,
  });
}

function fillLeadForm(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText(/Company name/), {
    target: { value: 'Toledo Glassworks' },
  });
  fireEvent.change(screen.getByLabelText(/Professional email/), {
    target: { value: 'batch@toledoglassworks.com' },
  });
  fireEvent.change(screen.getByLabelText(/Shipping address/), {
    target: { value: '1400 Industrial Pkwy, Toledo, OH 43605, USA' },
  });
  return container;
}

describe('MineralSelector flow', () => {
  it('walks industry → process → preview → submit and hands over the payload', async () => {
    const submitted: SampleRequestPayload[] = [];
    const onSubmit = vi.fn(async (payload: SampleRequestPayload) => {
      submitted.push(payload);
    });

    const { container } = render(<MineralSelector onSubmit={onSubmit} />);
    await reachStepThree();

    // The derived grade renders before any form input — the code shows
    // on both the summary card and the form intro.
    expect(screen.getAllByText('AGM-GLS-60').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Orthorhombic')).toBeTruthy();

    fillLeadForm(container);
    fireEvent.click(screen.getByRole('button', { name: /Request Verified Sample Kit/ }));

    await waitFor(() => screen.getByText(/Request received/), { timeout: 2000 });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = submitted[0]!;
    expect(payload.gradeCode).toBe('AGM-GLS-60');
    expect(payload.industry).toBe('Glass Manufacturing');
    expect(payload.process).toBe('Container glass batch');
    expect(payload.company).toBe('Toledo Glassworks');
    expect(payload.trackingId).toMatch(/^RFQ-AGM-\d{6}$/);
    expect(payload.honeypot).toBe(''); // untouched by a human
  });

  it('carries a filled honeypot through to the payload', async () => {
    const submitted: SampleRequestPayload[] = [];
    const onSubmit = vi.fn(async (payload: SampleRequestPayload) => {
      submitted.push(payload);
    });

    const { container } = render(<MineralSelector onSubmit={onSubmit} />);
    await reachStepThree();
    fillLeadForm(container);

    const trap = container.querySelector<HTMLInputElement>('input[name="website"]');
    expect(trap).not.toBeNull();
    fireEvent.change(trap!, { target: { value: 'https://spam.example' } });

    fireEvent.click(screen.getByRole('button', { name: /Request Verified Sample Kit/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), { timeout: 2000 });
    expect(submitted[0]!.honeypot).toBe('https://spam.example');
  });

  it('blocks submit on invalid fields and shows the messages', async () => {
    const onSubmit = vi.fn(async () => {});
    render(<MineralSelector onSubmit={onSubmit} />);
    await reachStepThree();

    fireEvent.change(screen.getByLabelText(/Professional email/), {
      target: { value: 'buyer@gmail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Request Verified Sample Kit/ }));

    await waitFor(() => screen.getByText(/Company name is required/), { timeout: 2000 });
    expect(screen.getByText(/company domain/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('surfaces a rejected submit as a retryable banner and keeps the draft', async () => {
    const onSubmit = vi
      .fn<(payload: SampleRequestPayload) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Endpoint warming up'))
      .mockResolvedValueOnce(undefined);

    const { container } = render(<MineralSelector onSubmit={onSubmit} />);
    await reachStepThree();
    fillLeadForm(container);

    fireEvent.click(screen.getByRole('button', { name: /Request Verified Sample Kit/ }));
    await waitFor(() => screen.getByRole('alert'), { timeout: 2000 });
    expect(screen.getByRole('alert').textContent).toContain('Endpoint warming up');

    // Draft survives; retry succeeds under the same flow.
    expect(screen.getByLabelText<HTMLInputElement>(/Company name/).value).toBe('Toledo Glassworks');
    fireEvent.click(screen.getByRole('button', { name: /Request Verified Sample Kit/ }));
    await waitFor(() => screen.getByText(/Request received/), { timeout: 2000 });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
