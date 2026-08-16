/* SampleRequestForm.tsx — the lead capture under the grade card.
 *
 * Three fields, because a fourth costs conversions and the desk can
 * ask for the rest on the reply. The form owns its own draft state and
 * hands a validated LeadDraft up; the parent owns what happens next.
 *
 * Validation timing: on blur for a field the buyer has left, live once
 * a field already shows an error (so it clears as they fix it), and a
 * full pass on submit that focuses the first field still failing. */

import { useRef, useState } from 'react';
import { hasErrors, validateField, validateLead } from '../lib/validation';
import type { LeadDraft, LeadErrors, LeadField } from '../types';
import { AlertIcon, ArrowIcon } from './Icons';
import { FormField } from './FormField';

interface SampleRequestFormProps {
  /** Resolve to commit, reject to surface a retryable error banner. */
  readonly onSubmit: (draft: LeadDraft) => Promise<void>;
  readonly gradeCode: string;
}

const EMPTY_DRAFT: LeadDraft = { company: '', email: '', shippingAddress: '' };

export function SampleRequestForm({ onSubmit, gradeCode }: SampleRequestFormProps) {
  const [draft, setDraft] = useState<LeadDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fieldRefs = useRef<Partial<Record<LeadField, HTMLInputElement | HTMLTextAreaElement | null>>>(
    {},
  );

  function setFieldRef(field: LeadField) {
    return (node: HTMLInputElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[field] = node;
    };
  }

  function handleChange(field: LeadField, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));

    // Only re-validate live on a field that is already complaining;
    // validating as someone types their first character is hostile.
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      const message = validateField(field, value);
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function handleBlur(field: LeadField) {
    const message = validateField(field, draft[field]);
    setErrors((previous) => {
      const next = { ...previous };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const found = validateLead(draft);
    setErrors(found);

    if (hasErrors(found)) {
      const order: LeadField[] = ['company', 'email', 'shippingAddress'];
      const firstBad = order.find((field) => found[field]);
      if (firstBad) fieldRefs.current[firstBad]?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(draft);
      // On success the parent swaps this form for the confirmation
      // view, so there is deliberately no state reset here.
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : 'The request could not be sent. Check your connection and try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="panel-rise">
      <div className="rounded-lg border border-ink-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 pb-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-ink-900">
              Request the verified sample kit
            </h3>
            <p className="mt-1 text-[13px] text-ink-500">
              A 2 kg sample of{' '}
              <span className="font-mono text-[12px] text-ink-700 tnum">{gradeCode}</span>, its
              Certificate of Analysis and the full technical packet.
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
            No obligation
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="company"
            label="Company name"
            value={draft.company}
            error={errors.company}
            autoComplete="organization"
            placeholder="Registered trading name"
            onChange={(value) => handleChange('company', value)}
            onBlur={() => handleBlur('company')}
            disabled={submitting}
            ref={setFieldRef('company')}
          />

          <FormField
            id="email"
            type="email"
            label="Professional email"
            value={draft.email}
            error={errors.email}
            hint="Your company domain — the technical packet is sent here."
            autoComplete="email"
            placeholder="name@company.com"
            onChange={(value) => handleChange('email', value)}
            onBlur={() => handleBlur('email')}
            disabled={submitting}
            ref={setFieldRef('email')}
          />

          <div className="sm:col-span-2">
            <FormField
              id="shipping-address"
              label="Shipping address"
              value={draft.shippingAddress}
              error={errors.shippingAddress}
              hint="Where the sample kit ships. Include the postal code and country."
              autoComplete="street-address"
              placeholder="Street, city, state / province, postal code, country"
              multiline
              rows={3}
              onChange={(value) => handleChange('shippingAddress', value)}
              onBlur={() => handleBlur('shippingAddress')}
              disabled={submitting}
              ref={setFieldRef('shippingAddress')}
            />
          </div>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded border border-hematite-600/40 bg-hematite-100 px-3.5 py-3 text-[13px] text-hematite-600"
          >
            <AlertIcon className="mt-px size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-ink-900 px-7 text-[15px] font-medium text-bone transition-colors duration-200 hover:bg-ink-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 disabled:cursor-not-allowed disabled:bg-ink-400"
          >
            {submitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-bone/40 border-t-bone"
                />
                Dispatching…
              </>
            ) : (
              <>
                Request Verified Sample Kit
                <ArrowIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p className="text-[12px] leading-relaxed text-ink-400 sm:max-w-[19rem] sm:text-right">
            Used only to route and ship this request. No list, no third parties.
          </p>
        </div>
      </div>
    </form>
  );
}
