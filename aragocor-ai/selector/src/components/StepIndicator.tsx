/* StepIndicator.tsx — the three-stop progress rule in the masthead.
 * Completed stops are clickable so a buyer can go back and change the
 * mesh without losing the industry they already picked. */

import { CheckIcon } from './Icons';

export interface StepDefinition {
  readonly id: string;
  readonly label: string;
}

interface StepIndicatorProps {
  readonly steps: readonly StepDefinition[];
  /** Zero-based index of the visible step. */
  readonly current: number;
  /** Highest step the buyer has legitimately reached. */
  readonly furthest: number;
  readonly onSelect: (index: number) => void;
}

export function StepIndicator({ steps, current, furthest, onSelect }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Selector progress">
      {steps.map((step, index) => {
        const isComplete = index < current;
        const isCurrent = index === current;
        const canVisit = index <= furthest && index !== current;

        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`h-px w-4 shrink-0 transition-colors duration-300 sm:w-8 ${
                  isComplete || isCurrent ? 'bg-fluor-300' : 'bg-ink-600'
                }`}
              />
            )}
            <button
              type="button"
              disabled={!canVisit}
              onClick={() => canVisit && onSelect(index)}
              aria-current={isCurrent ? 'step' : undefined}
              className={`group flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-300 sm:pr-3 ${
                canVisit ? 'cursor-pointer hover:bg-ink-800' : 'cursor-default'
              }`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300 tnum ${
                  isComplete
                    ? 'border-malachite-600 bg-malachite-600 text-white'
                    : isCurrent
                      ? 'border-fluor-300 bg-fluor-600 text-white'
                      : 'border-ink-600 bg-transparent text-ink-400'
                }`}
              >
                {isComplete ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span
                className={`hidden text-xs font-medium tracking-wide transition-colors duration-300 sm:inline ${
                  isCurrent ? 'text-ink-50' : isComplete ? 'text-ink-300' : 'text-ink-400'
                }`}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
