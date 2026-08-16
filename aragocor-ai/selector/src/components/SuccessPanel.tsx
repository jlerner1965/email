/* SuccessPanel.tsx — the confirmation view.
 *
 * The buyer has just handed over a shipping address; the job here is to
 * tell them exactly what was dispatched, where it went and what the
 * tracking reference is, so nobody has to email the desk to ask. */

import type { SampleRequestPayload, TailoredGrade } from '../types';
import { CheckIcon } from './Icons';

interface SuccessPanelProps {
  readonly payload: SampleRequestPayload;
  readonly grade: TailoredGrade;
  readonly onReset: () => void;
}

export function SuccessPanel({ payload, grade, onReset }: SuccessPanelProps) {
  const dispatched = [
    `Technical data sheet for ${grade.code}, with the full assay range`,
    'Certificate of Analysis from the current production lot',
    grade.omri === 'listed'
      ? 'OMRI listing certificate and heavy-metal screen'
      : 'Compliance and test-method documentation for this grade',
    'Sample kit tracking number, sent as soon as the courier scans it',
  ];

  return (
    <div className="step-enter-forward">
      <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
        {/* ── the seal ──────────────────────────────────────── */}
        <div className="border-b border-ink-100 bg-malachite-100 px-6 py-8 text-center sm:px-10">
          <span className="seal-in mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-malachite-600 text-white">
            <CheckIcon className="size-7" />
          </span>

          <h2 className="font-serif text-2xl leading-tight font-semibold text-ink-900">
            Your sample kit is on its way
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
            The customised technical packet for{' '}
            <span className="font-semibold text-ink-900">{grade.title}</span> has been dispatched to{' '}
            <span className="font-semibold text-ink-900">{payload.email}</span>. Sample tracking
            details follow in the same thread the moment the kit leaves the warehouse.
          </p>

          <p className="mt-5 inline-flex items-center gap-2 rounded border border-malachite-600/30 bg-white px-3 py-1.5 font-mono text-[13px] font-medium text-malachite-700 tnum">
            <span className="text-[10px] tracking-[0.14em] text-ink-400 uppercase">Reference</span>
            {payload.trackingId}
          </p>
        </div>

        {/* ── what was sent ─────────────────────────────────── */}
        <div className="grid gap-8 px-6 py-6 sm:grid-cols-2 sm:px-10 sm:py-8">
          <div>
            <h3 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
              In your inbox now
            </h3>
            <ul className="space-y-2.5">
              {dispatched.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-600">
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-malachite-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
              Request summary
            </h3>
            <dl className="space-y-0">
              {[
                ['Grade', payload.gradeCode],
                ['Application', payload.process],
                ['Particle size', payload.particleSize],
                ['Purity', payload.purity],
                ['Company', payload.company],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-dashed border-ink-100 py-2 last:border-b-0"
                >
                  <dt className="text-[13px] text-ink-500">{label}</dt>
                  <dd className="text-right text-[13px] font-medium text-ink-900 tnum">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
              Ships to{' '}
              <span className="text-ink-700">{payload.shippingAddress.split('\n').join(', ')}</span>.
            </p>
          </div>
        </div>

        {/* ── what happens next ─────────────────────────────── */}
        <div className="flex flex-col gap-4 border-t border-ink-100 bg-ink-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-[13px] leading-relaxed text-ink-600">
            A technical sales engineer reviews every request within one business day. Reply to that
            email with a tonnage and we will quote against it.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-md border border-ink-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-800 transition-colors duration-200 hover:border-ink-600 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-600"
          >
            Specify another grade
          </button>
        </div>
      </div>
    </div>
  );
}
