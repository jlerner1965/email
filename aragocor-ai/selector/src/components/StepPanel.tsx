/* StepPanel.tsx — the frame every step shares: eyebrow, heading, lede,
 * and the directional enter animation.
 *
 * The animation is keyed by the caller (<StepPanel key={step} …>), so
 * React remounts the node on a step change and the CSS animation runs
 * again. Direction decides which side it travels from, so "back" does
 * not read as another "forward". */

import { useEffect, useRef, type ReactNode } from 'react';

export type StepDirection = 'forward' | 'back';

interface StepPanelProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly direction: StepDirection;
  /** Move keyboard focus to the heading on mount, so a step change is
   *  announced to screen readers instead of dropping focus on <body>.
   *  Leave false for the initial render — stealing focus on page load
   *  would yank a visitor down to the widget. */
  readonly focusOnMount?: boolean;
  readonly children: ReactNode;
  /** Rendered under the children — usually the nav buttons. */
  readonly footer?: ReactNode;
}

export function StepPanel({
  eyebrow,
  title,
  lede,
  direction,
  focusOnMount = false,
  children,
  footer,
}: StepPanelProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // keepInView in the orchestrator owns scrolling; preventScroll
    // stops the focus call fighting it mid-animation.
    if (focusOnMount) headingRef.current?.focus({ preventScroll: true });
    // Mount-only by design — the panel is remounted (keyed) per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={direction === 'forward' ? 'step-enter-forward' : 'step-enter-back'}>
      <header className="mb-6">
        <p className="mb-2 font-mono text-[11px] font-medium tracking-[0.18em] text-fluor-600 uppercase">
          {eyebrow}
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-2xl leading-tight font-semibold text-ink-900 outline-none sm:text-[26px]"
        >
          {title}
        </h2>
        {lede && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{lede}</p>}
      </header>

      {children}

      {footer && <div className="mt-8 border-t border-ink-100 pt-6">{footer}</div>}
    </div>
  );
}
