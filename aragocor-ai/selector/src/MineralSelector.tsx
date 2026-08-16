/* MineralSelector.tsx — the orchestrator.
 *
 * Owns the specification (industry → process → mesh → notes), the step
 * cursor and the travel direction. Each step is a presentational
 * component that takes what it needs and reports back; none of them
 * know what step they are, which is what makes them reorderable.
 *
 * Drop-in usage:
 *
 *   <MineralSelector onSubmit={(payload) => post('/api/rfq', payload)} />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GradeSummary } from './components/GradeSummary';
import { IndustryStep } from './components/IndustryStep';
import { ProcessStep } from './components/ProcessStep';
import { SampleRequestForm } from './components/SampleRequestForm';
import { StepIndicator, type StepDefinition } from './components/StepIndicator';
import { StepPanel, type StepDirection } from './components/StepPanel';
import { SuccessPanel } from './components/SuccessPanel';
import { INDUSTRIES, findIndustry, findProcess } from './data/minerals';
import { defaultMeshFor, deriveGrade, makeTrackingId } from './lib/grade';
import { buildPayload } from './lib/payload';
import type {
  IndustryId,
  LeadDraft,
  MeshSize,
  SampleRequestPayload,
  Specification,
} from './types';

const STEPS: readonly StepDefinition[] = [
  { id: 'industry', label: 'Industry' },
  { id: 'process', label: 'Process & sizing' },
  { id: 'sample', label: 'Grade & sample' },
];

/** How long the chosen card stays lit before step 2 slides in. Long
 *  enough to read as acknowledgement, short enough not to feel laggy. */
const HANDOFF_MS = 190;

export interface MineralSelectorProps {
  /** Where a completed request goes. Throw (or reject) to put a
   *  retryable error banner under the form. Defaults to a local
   *  simulated dispatch so the widget is demoable with no backend. */
  readonly onSubmit?: (payload: SampleRequestPayload) => Promise<void> | void;
  /** Fired on every step change, for analytics funnels. */
  readonly onStepChange?: (stepIndex: number, stepId: string) => void;
  /** Skip step 1 when the landing page already knows the vertical. */
  readonly defaultIndustry?: IndustryId;
  readonly className?: string;
  readonly eyebrow?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

async function simulateDispatch(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900));
}

export function MineralSelector({
  onSubmit,
  onStepChange,
  defaultIndustry,
  className = '',
  eyebrow = 'Aragonite · CaCO₃',
}: MineralSelectorProps) {
  const seedIndustry = defaultIndustry ? findIndustry(defaultIndustry) : undefined;

  const [step, setStep] = useState(seedIndustry ? 1 : 0);
  const [furthest, setFurthest] = useState(seedIndustry ? 1 : 0);
  const [direction, setDirection] = useState<StepDirection>('forward');

  const [industryId, setIndustryId] = useState<IndustryId | null>(seedIndustry?.id ?? null);
  const [pendingId, setPendingId] = useState<IndustryId | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [mesh, setMesh] = useState<MeshSize>(seedIndustry ? middleMesh(seedIndustry.meshRange) : 100);
  const [meshTouched, setMeshTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [processError, setProcessError] = useState<string | undefined>(undefined);

  const [payload, setPayload] = useState<SampleRequestPayload | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** One tracking ID per request, held across retries so a failed
   *  attempt and its retry are the same lead, not two. */
  const trackingIdRef = useRef<string | null>(null);
  /** False until the buyer navigates; keeps the initial render from
   *  stealing page focus into the widget. */
  const hasNavigated = useRef(false);

  // A pending hand-off must not fire into an unmounted tree.
  useEffect(
    () => () => {
      if (handoffTimer.current) clearTimeout(handoffTimer.current);
    },
    [],
  );

  useEffect(() => {
    onStepChange?.(step, STEPS[step]?.id ?? 'unknown');
  }, [step, onStepChange]);

  const industry = useMemo(() => findIndustry(industryId), [industryId]);

  const spec: Specification | null = useMemo(() => {
    if (!industryId || !processId) return null;
    return { industryId, processId, mesh, applicationNotes: notes };
  }, [industryId, processId, mesh, notes]);

  const grade = useMemo(() => (spec ? deriveGrade(spec) : null), [spec]);

  /** Keep the top of the widget in view when a step changes height. */
  const keepInView = useCallback(() => {
    const node = rootRef.current;
    if (!node) return;
    if (node.getBoundingClientRect().top >= 0) return;
    node.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      // After a successful submit the confirmation view owns the body;
      // moving the cursor would change the indicator but not the view.
      if (payload) return;
      hasNavigated.current = true;
      setDirection(next >= step ? 'forward' : 'back');
      setStep(next);
      setFurthest((previous) => Math.max(previous, next));
      keepInView();
    },
    [step, keepInView, payload],
  );

  function handleIndustrySelect(id: IndustryId) {
    const picked = findIndustry(id);
    if (!picked) return;

    // Switching vertical invalidates the process and the mesh, because
    // neither is guaranteed to exist in the new one.
    if (id !== industryId) {
      setProcessId(null);
      setProcessError(undefined);
      setMeshTouched(false);
      setMesh(middleMesh(picked.meshRange));
    }

    setIndustryId(id);
    setPendingId(id);

    if (handoffTimer.current) clearTimeout(handoffTimer.current);
    handoffTimer.current = setTimeout(() => {
      setPendingId(null);
      goTo(1);
    }, HANDOFF_MS);
  }

  function handleProcessChange(nextProcessId: string) {
    setProcessId(nextProcessId);
    setProcessError(undefined);

    // Follow the process recommendation until the buyer overrides it.
    if (!meshTouched && industry) {
      const process = findProcess(industry, nextProcessId);
      if (process) setMesh(defaultMeshFor(process, industry));
    }
  }

  function handleMeshChange(nextMesh: MeshSize) {
    setMesh(nextMesh);
    setMeshTouched(true);
  }

  function handleContinueToPreview() {
    if (!processId) {
      setProcessError('Choose the process this material is going into.');
      return;
    }
    goTo(2);
  }

  async function handleSampleSubmit(draft: LeadDraft) {
    if (!grade) throw new Error('The specification is incomplete. Go back and pick a process.');

    trackingIdRef.current ??= makeTrackingId();
    const built = buildPayload(draft, grade, notes, trackingIdRef.current);
    if (onSubmit) await onSubmit(built);
    else await simulateDispatch();

    trackingIdRef.current = null; // the next request is a new lead
    setPayload(built);
    keepInView();
  }

  function handleReset() {
    trackingIdRef.current = null;
    setPayload(null);
    setIndustryId(null);
    setPendingId(null);
    setProcessId(null);
    setProcessError(undefined);
    setMesh(100);
    setMeshTouched(false);
    setNotes('');
    setFurthest(0);
    setDirection('back');
    setStep(0);
    keepInView();
  }

  return (
    <div
      ref={rootRef}
      className={`mx-auto w-full max-w-5xl scroll-mt-6 overflow-hidden rounded-xl border border-ink-200 bg-ink-50 shadow-[0_30px_80px_-50px_rgba(7,13,21,0.55)] ${className}`}
    >
      {/* ── masthead ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-ink-900 px-5 py-4 sm:px-7">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[15px] font-semibold tracking-tight text-white">
            Aragocor Minerals
          </span>
          <span className="hidden font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase sm:inline">
            {eyebrow}
          </span>
        </div>
        <StepIndicator steps={STEPS} current={step} furthest={furthest} onSelect={goTo} />
      </header>

      {/* ── body ────────────────────────────────────────────── */}
      <div className="px-5 py-7 sm:px-7 sm:py-8">
        {payload && grade ? (
          <SuccessPanel payload={payload} grade={grade} onReset={handleReset} />
        ) : (
          <>
            {step === 0 && (
              <StepPanel
                key="step-industry"
                focusOnMount={hasNavigated.current}
                direction={direction}
                eyebrow="Step 1 of 3"
                title="Which industry are you specifying for?"
                lede="Pick the vertical and we will narrow the process list, the mesh range and the compliance paperwork to what that industry actually asks for."
              >
                <IndustryStep
                  industries={INDUSTRIES}
                  selectedId={industryId}
                  pendingId={pendingId}
                  onSelect={handleIndustrySelect}
                />
              </StepPanel>
            )}

            {step === 1 && industry && (
              <StepPanel
                key="step-process"
                focusOnMount={hasNavigated.current}
                direction={direction}
                eyebrow={`Step 2 of 3 · ${industry.title}`}
                title="Process requirement and sizing"
                lede="Tell us where it goes and how fine you need it. Every figure on the next screen is derived from these two answers."
                footer={
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => goTo(0)}
                      className="rounded-md border border-ink-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-700 transition-colors duration-200 hover:border-ink-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-600"
                    >
                      Change industry
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueToPreview}
                      className="group inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-600"
                    >
                      Generate technical preview
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </button>
                  </div>
                }
              >
                <ProcessStep
                  industry={industry}
                  processId={processId}
                  mesh={mesh}
                  notes={notes}
                  onProcessChange={handleProcessChange}
                  onMeshChange={handleMeshChange}
                  onNotesChange={setNotes}
                  processError={processError}
                />
              </StepPanel>
            )}

            {step === 2 && grade && (
              <StepPanel
                key="step-sample"
                focusOnMount={hasNavigated.current}
                direction={direction}
                eyebrow="Step 3 of 3 · Tailored grade"
                title="Your grade, and the sample kit that proves it"
                lede="Generated from your selections against current production ranges. Request the kit and the full packet lands in your inbox."
                footer={
                  <button
                    type="button"
                    onClick={() => goTo(1)}
                    className="rounded-md border border-ink-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-700 transition-colors duration-200 hover:border-ink-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fluor-600"
                  >
                    Adjust process or sizing
                  </button>
                }
              >
                <div className="space-y-6">
                  <GradeSummary grade={grade} notes={notes} />
                  <SampleRequestForm gradeCode={grade.code} onSubmit={handleSampleSubmit} />
                </div>
              </StepPanel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** A sensible opening cut before a process narrows it down. */
function middleMesh(range: readonly MeshSize[]): MeshSize {
  return range[Math.floor(range.length / 2)] ?? 100;
}
