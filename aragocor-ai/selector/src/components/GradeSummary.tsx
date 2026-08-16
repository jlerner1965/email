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
      className="panel-rise overflow-hidden rounded-lg border border-ink-900 bg-[radial-gradient(ellipse_at_25%_35%,#294C57_0%,#0E3540_72%)] text-bone/80 shadow-[0_12px_32px_rgba(14,53,64,0.14),0_24px_64px_rgba(14,53,64,0.12)]"
    >
      {/* ── masthead ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-bone/15 px-6 py-5">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded bg-bone/10 text-sand">
            <Icon id={grade.industry.icon} className="size-6" />
          </span>
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-[0.18em] text-bone/50 uppercase">
              Tailored grade &amp; compliance summary
            </p>
            <h3 className="font-serif text-xl leading-tight font-semibold text-bone">
              {grade.title}
            </h3>
            <p className="mt-1 text-[13px] text-bone/70">{grade.process.label}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded border border-bone/25 bg-ink-950/60 px-2.5 py-1 font-mono text-xs font-medium tracking-wider text-sand tnum">
            {grade.code}
          </span>
          {isOmriListed && (
            <span className="flex items-center gap-1.5 rounded-full bg-bone px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-900">
              <CheckIcon className="size-3" />
              OMRI Listed
            </span>
          )}
        </div>
      </header>

      {/* ── the four headline figures ───────────────────────── */}
      <dl className="grid grid-cols-1 divide-y divide-bone/15 border-b border-bone/15 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {grade.headline.map((parameter, index) => (
          <div
            key={parameter.label}
            className={`px-6 py-4 sm:border-bone/15 ${index % 2 === 1 ? 'sm:border-l' : ''} ${
              index >= 2 ? 'sm:border-t lg:border-t-0' : ''
            } ${index === 2 ? 'lg:border-l' : ''} ${index === 3 ? 'lg:border-l' : ''}`}
          >
            <dt className="font-mono text-[10px] tracking-[0.14em] text-bone/50 uppercase">
              {parameter.label}
            </dt>
            <dd className="mt-1.5 text-[15px] leading-snug font-semibold text-bone tnum">
              {parameter.value}
            </dd>
            {parameter.note && (
              <dd className="mt-1 text-[11.5px] leading-snug text-bone/50">{parameter.note}</dd>
            )}
          </div>
        ))}
      </dl>

      {/* ── the rest of the assay ───────────────────────────── */}
      <div className="grid gap-x-10 gap-y-0 px-6 py-5 sm:grid-cols-2">
        {grade.parameters.map((parameter) => (
          <div
            key={parameter.label}
            className="flex items-baseline justify-between gap-4 border-b border-dashed border-bone/15 py-2.5 last:border-b-0"
          >
            <span className="text-[13px] text-bone/70">
              {parameter.label}
              {parameter.note && (
                <span className="ml-1.5 font-mono text-[10px] text-bone/45">{parameter.note}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-[13px] font-medium text-bone tnum">
              {parameter.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── compliance & packing ────────────────────────────── */}
      <div className="grid gap-6 border-t border-bone/15 bg-ink-950/45 px-6 py-5 sm:grid-cols-2">
        <div>
          <h4 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-bone/50 uppercase">
            Compliance &amp; documentation
          </h4>
          <ul className="space-y-2">
            {grade.compliance.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-bone/85">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-sand" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-bone/50 uppercase">
            Available packing
          </h4>
          <ul className="flex flex-wrap gap-2">
            {grade.packing.map((pack) => (
              <li
                key={pack}
                className="rounded border border-bone/15 px-2.5 py-1 text-[12px] text-bone/85"
              >
                {pack}
              </li>
            ))}
          </ul>

          {notes.trim() && (
            <div className="mt-4">
              <h4 className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-bone/50 uppercase">
                Your notes
              </h4>
              <p className="border-l-2 border-sand pl-3 text-[12.5px] leading-relaxed text-bone/75 italic">
                {notes.trim()}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-bone/15 px-6 py-3 text-[11.5px] leading-relaxed text-bone/45">
        Figures are typical commercial production ranges, not a contractual specification. Every
        shipment ships against its own Certificate of Analysis.
      </p>
    </section>
  );
}
