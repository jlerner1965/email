/* App.tsx — the landing-page section the selector sits in. The widget
 * itself is <MineralSelector/>; everything around it is stage dressing
 * showing how it lands on aragocorminerals.com.
 *
 * Lead capture resolves through resolveRfqConfig: build-time env when
 * set, otherwise the deploy's own rfq-config.json (editable in the
 * repo, no dashboard needed). With neither, submits simulate so the
 * page stays demoable. A submit awaits the resolution, so a buyer who
 * races the config fetch still delivers to the real endpoint. */

import { useEffect, useMemo } from 'react';
import { MineralSelector } from './MineralSelector';
import { resolveRfqConfig } from './lib/config';
import { createDispatcher, type Dispatcher } from './lib/dispatch';
import type { SampleRequestPayload } from './types';

async function simulateDispatch(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900));
}

function makeLeadPipeline() {
  const dispatcherPromise: Promise<Dispatcher | null> = resolveRfqConfig().then((config) =>
    config ? createDispatcher(config) : null,
  );
  return {
    dispatcherPromise,
    async submit(payload: SampleRequestPayload): Promise<void> {
      const dispatcher = await dispatcherPromise;
      if (dispatcher) await dispatcher.submit(payload);
      else await simulateDispatch();
    },
  };
}

export default function App() {
  const pipeline = useMemo(makeLeadPipeline, []);

  // Anything a previous session left pending or failed goes out again
  // on load — a flaky connection at the buyer's end can't cost a lead.
  useEffect(() => {
    void pipeline.dispatcherPromise.then((dispatcher) => dispatcher?.flushQueue());
  }, [pipeline]);

  return (
    <main className="min-h-screen bg-silica">
      {/* Section intro, as it would appear mid-landing-page. */}
      <section className="px-5 pt-14 pb-6 sm:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.2em] text-fluor-600 uppercase">
            Technical grade selector
          </p>
          <h1 className="mx-auto max-w-3xl font-serif text-3xl leading-tight font-semibold text-ink-900 sm:text-4xl">
            Specify the exact aragonite grade your process needs
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-500">
            Three questions, one tailored specification, and a verified sample kit on your desk.
            96–98% CaCO₃, orthorhombic aragonite, ground and screened to U.S. mesh.
          </p>
        </div>
      </section>

      <section className="px-5 pb-20">
        <MineralSelector
          onSubmit={pipeline.submit}
          onStepChange={(index, id) => {
            // Analytics hook: wire to your tracker of choice.
            if (import.meta.env.DEV) console.info(`[selector] step ${index + 1}: ${id}`);
          }}
        />

        <p className="mx-auto mt-6 max-w-5xl text-center font-mono text-[11px] tracking-wide text-ink-400">
          ISO 9001 quality system · OMRI Listed grades · COA with every shipment
        </p>
      </section>
    </main>
  );
}
