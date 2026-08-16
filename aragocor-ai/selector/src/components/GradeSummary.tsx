/* GradeSummary.tsx — the "Tailored Grade & Compliance Summary" card.
 *
 * A mill certificate rendered in ink navy: grade code in the corner,
 * the four headline figures across the top, the rest of the assay
 * underneath, then compliance and packing. Everything here is derived
 * from the Specification — nothing is typed in twice. */

import type { TailoredGrade } from '../types';
import { CheckIcon, Icon } from './Icons';

interface GradeSummaryProps {
  readonly grade: TailoredGrade;
  readonly notes: string;
}

export function GradeSummary({ grade, notes }: GradeSummaryProps) {
  const isOmriListed = grade.omri === 'listed';

  return (
    <section
      aria-label="Tailored grade and compliance summary"
      className="panel-rise overflow-hidden rounded-lg border border-ink-900 bg-ink-900 text-ink-100 shadow-[0_24px_60px_-32px_rgba(7,13,21,0.8)]"
    >
      {/* ── masthead ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 px-6 py-5">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink-800 text-fluor-300">
            <Icon id={grade.industry.icon} className="size-6" />
          </span>
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
              Tailored grade &amp; compliance summary
            </p>
            <h3 className="font-serif text-xl leading-tight font-semibold text-white">
              {grade.title}
            </h3>
            <p className="mt-1 text-[13px] text-ink-300">{grade.process.label}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded border border-ink-600 bg-ink-950 px-2.5 py-1 font-mono text-xs font-medium tracking-wider text-fluor-300 tnum">
            {grade.code}
          </span>
          {isOmriListed && (
            <span className="flex items-center gap-1.5 rounded-full bg-malachite-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
              <CheckIcon className="size-3" />
              OMRI Listed
            </span>
          )}
        </div>
      </header>

      {/* ── the four headline figures ───────────────────────── */}
      <dl className="grid grid-cols-1 divide-y divide-ink-700 border-b border-ink-700 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {grade.headline.map((parameter, index) => (
          <div
            key={parameter.label}
            className={`px-6 py-4 sm:border-ink-700 ${index % 2 === 1 ? 'sm:border-l' : ''} ${
              index >= 2 ? 'sm:border-t lg:border-t-0' : ''
            } ${index === 2 ? 'lg:border-l' : ''} ${index === 3 ? 'lg:border-l' : ''}`}
          >
            <dt className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
              {parameter.label}
            </dt>
            <dd className="mt-1.5 text-[15px] leading-snug font-semibold text-white tnum">
              {parameter.value}
            </dd>
            {parameter.note && (
              <dd className="mt-1 text-[11.5px] leading-snug text-ink-400">{parameter.note}</dd>
            )}
          </div>
        ))}
      </dl>

      {/* ── the rest of the assay ───────────────────────────── */}
      <div className="grid gap-x-10 gap-y-0 px-6 py-5 sm:grid-cols-2">
        {grade.parameters.map((parameter) => (
          <div
            key={parameter.label}
            className="flex items-baseline justify-between gap-4 border-b border-dashed border-ink-700/70 py-2.5 last:border-b-0"
          >
            <span className="text-[13px] text-ink-300">
              {parameter.label}
              {parameter.note && (
                <span className="ml-1.5 font-mono text-[10px] text-ink-500">{parameter.note}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-[13px] font-medium text-white tnum">
              {parameter.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── compliance & packing ────────────────────────────── */}
      <div className="grid gap-6 border-t border-ink-700 bg-ink-950 px-6 py-5 sm:grid-cols-2">
        <div>
          <h4 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
            Compliance &amp; documentation
          </h4>
          <ul className="space-y-2">
            {grade.compliance.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-ink-200">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-malachite-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
            Available packing
          </h4>
          <ul className="flex flex-wrap gap-2">
            {grade.packing.map((pack) => (
              <li
                key={pack}
                className="rounded border border-ink-700 px-2.5 py-1 text-[12px] text-ink-200"
              >
                {pack}
              </li>
            ))}
          </ul>

          {notes.trim() && (
            <div className="mt-4">
              <h4 className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
                Your notes
              </h4>
              <p className="border-l-2 border-fluor-500 pl-3 text-[12.5px] leading-relaxed text-ink-300 italic">
                {notes.trim()}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-ink-700 px-6 py-3 text-[11.5px] leading-relaxed text-ink-500">
        Figures are typical commercial production ranges, not a contractual specification. Every
        shipment ships against its own Certificate of Analysis.
      </p>
    </section>
  );
}
