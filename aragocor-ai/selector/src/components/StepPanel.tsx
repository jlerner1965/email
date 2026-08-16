/* StepPanel.tsx — the frame every step shares: eyebrow, heading, lede,
 * and the directional enter animation.
 *
 * The animation is keyed by the caller (<StepPanel key={step} …>), so
 * React remounts the node on a step change and the CSS animation runs
 * again. Direction decides which side it travels from, so "back" does
 * not read as another "forward". */

import type { ReactNode } from 'react';

export type StepDirection = 'forward' | 'back';

interface StepPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly direction: StepDirection;
  readonly children: ReactNode;
  /** Rendered under the children — usually the nav buttons. */
  readonly footer?: ReactNode;
}

export function StepPanel({ eyebrow, title, lede, direction, children, footer }: StepPanelProps) {
  return (
    <div className={direction === 'forward' ? 'step-enter-forward' : 'step-enter-back'}>
      <header className="mb-6">
        <p className="mb-2 font-mono text-[11px] font-medium tracking-[0.18em] text-fluor-600 uppercase">
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl leading-tight font-semibold text-ink-900 sm:text-[26px]">
          {title}
        </h2>
        {lede && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{lede}</p>}
      </header>

      {children}

      {footer && <div className="mt-8 border-t border-ink-100 pt-6">{footer}</div>}
    </div>
  );
}
