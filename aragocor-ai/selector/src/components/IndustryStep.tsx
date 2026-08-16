/* IndustryStep.tsx — step 1. A card grid of the five verticals.
 *
 * Selection is committed by the parent the moment a card is pressed;
 * `pendingId` lets the parent hold the chosen card lit for a beat
 * before the panel slides out, so the click visibly registers. */

import { INDUSTRIES } from '../data/minerals';
import type { Industry, IndustryId } from '../types';
import { ArrowIcon, Icon } from './Icons';

interface IndustryStepProps {
  readonly selectedId: IndustryId | null;
  /** Card lit during the hand-off to step 2. */
  readonly pendingId: IndustryId | null;
  readonly onSelect: (id: IndustryId) => void;
  readonly industries?: readonly Industry[];
}

export function IndustryStep({
  selectedId,
  pendingId,
  onSelect,
  industries = INDUSTRIES,
}: IndustryStepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {industries.map((industry, index) => {
        const isActive = pendingId === industry.id || selectedId === industry.id;

        return (
          <button
            key={industry.id}
            type="button"
            onClick={() => onSelect(industry.id)}
            aria-pressed={isActive}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`panel-rise group relative flex h-full flex-col items-start rounded-lg border bg-white p-5 text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 ${
              isActive
                ? 'border-ink-900 shadow-[0_0_0_1px_#0E3540,0_4px_12px_rgba(14,53,64,0.10),0_12px_32px_rgba(14,53,64,0.08)]'
                : 'border-ink-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-[0_4px_12px_rgba(14,53,64,0.10),0_12px_32px_rgba(14,53,64,0.08)]'
            }`}
          >
            <span
              className={`mb-4 flex size-12 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${
                isActive
                  ? 'border-ink-900 bg-ink-900 text-bone'
                  : 'border-ink-600 bg-transparent text-ink-600 group-hover:border-ink-900 group-hover:text-ink-900'
              }`}
            >
              <Icon id={industry.icon} className="size-6" />
            </span>

            <span className="font-serif text-[17px] leading-snug font-semibold text-ink-900">
              {industry.title}
            </span>

            <span className="mt-2 text-[13px] leading-relaxed text-ink-500">
              {industry.valueProp}
            </span>

            <span
              className={`mt-4 flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase transition-colors duration-200 ${
                isActive ? 'text-ink-600' : 'text-ink-400 group-hover:text-ink-700'
              }`}
            >
              {isActive ? 'Selected' : 'Specify'}
              <ArrowIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
