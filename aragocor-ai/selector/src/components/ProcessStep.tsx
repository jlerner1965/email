/* ProcessStep.tsx — step 2. Process requirement, mesh cut, and the
 * free-text notes the desk actually reads before quoting.
 *
 * The process list and the mesh range both come from the industry
 * chosen in step 1, so a glass buyer is never offered a feed-grade
 * process or a 325-mesh batch cut. */

import { NOTES_MAX_LENGTH } from '../lib/validation';
import type { Industry, MeshSize } from '../types';
import { MeshSelector } from './MeshSelector';

interface ProcessStepProps {
  readonly industry: Industry;
  readonly processId: string | null;
  readonly mesh: MeshSize;
  readonly notes: string;
  readonly onProcessChange: (processId: string) => void;
  readonly onMeshChange: (mesh: MeshSize) => void;
  readonly onNotesChange: (notes: string) => void;
  /** Set when the buyer tried to continue without picking a process. */
  readonly processError?: string | undefined;
}

export function ProcessStep({
  industry,
  processId,
  mesh,
  notes,
  onProcessChange,
  onMeshChange,
  onNotesChange,
  processError,
}: ProcessStepProps) {
  const selectedProcess = industry.processes.find((process) => process.id === processId) ?? null;
  const remaining = NOTES_MAX_LENGTH - notes.length;

  return (
    <div className="space-y-8">
      {/* ── process requirement ─────────────────────────────── */}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink-900">
          Process requirement
          <span className="ml-1.5 font-normal text-hematite-600" aria-hidden="true">
            *
          </span>
        </legend>
        <p className="mb-3 text-[13px] text-ink-500">
          Where the material goes decides the cut, the assay ceiling and the paperwork.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {industry.processes.map((process) => {
            const isSelected = process.id === processId;
            return (
              <label
                key={process.id}
                className={`group flex cursor-pointer gap-3 rounded border p-3.5 transition-colors duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink-900 ${
                  isSelected
                    ? 'border-ink-900 bg-sand/30'
                    : 'border-ink-200 bg-white hover:border-ink-600'
                }`}
              >
                <input
                  type="radio"
                  name="process"
                  value={process.id}
                  checked={isSelected}
                  onChange={() => onProcessChange(process.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                    isSelected ? 'border-ink-900' : 'border-ink-300 group-hover:border-ink-600'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full transition-transform duration-200 ${
                      isSelected ? 'scale-100 bg-ink-900' : 'scale-0 bg-transparent'
                    }`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900">{process.label}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-500">
                    {process.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {processError && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-hematite-600">
            {processError}
          </p>
        )}
      </fieldset>

      {/* ── mesh sizing ─────────────────────────────────────── */}
      <div>
        <h3 id="mesh-label" className="mb-1 text-sm font-semibold text-ink-900">
          U.S. mesh sizing
        </h3>
        <p className="mb-3 text-[13px] text-ink-500">
          Standard production cuts for {industry.title.toLowerCase()}, 20 Mesh through{' '}
          <span className="tnum">{industry.meshRange[industry.meshRange.length - 1]}</span> Mesh.
          Intermediate and custom cuts are available against a firm tonnage.
        </p>
        <MeshSelector
          labelId="mesh-label"
          options={industry.meshRange}
          value={mesh}
          onChange={onMeshChange}
          recommended={selectedProcess?.recommendedMesh ?? null}
        />
      </div>

      {/* ── application notes ───────────────────────────────── */}
      <div>
        <label htmlFor="application-notes" className="mb-1 block text-sm font-semibold text-ink-900">
          Application notes{' '}
          <span className="font-normal text-ink-400">— optional, but it speeds the quote up</span>
        </label>
        <p className="mb-3 text-[13px] text-ink-500">
          Tonnage, target assay, packing, destination port, or the spec you are matching against.
        </p>
        <textarea
          id="application-notes"
          rows={3}
          maxLength={NOTES_MAX_LENGTH}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="e.g. 500 MT/month, Fe₂O₃ under 0.04%, 1.0 MT lined FIBC, CIF Rotterdam."
          className="w-full resize-y rounded border border-ink-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 transition-colors duration-200 placeholder:text-ink-300 focus:border-ink-900 focus:outline-2 focus:outline-offset-0 focus:outline-ink-900"
        />
        <p
          className={`mt-1.5 text-right font-mono text-[11px] tnum ${
            remaining <= 40 ? 'text-barite-600' : 'text-ink-400'
          }`}
        >
          {remaining} characters left
        </p>
      </div>
    </div>
  );
}
