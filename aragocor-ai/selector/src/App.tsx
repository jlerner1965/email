/* App.tsx — the landing-page section the selector sits in. The widget
 * itself is <MineralSelector/>; everything around it is stage dressing
 * showing how it lands on aragocorminerals.com.
 *
 * Lead capture is wired through createDispatcher when an endpoint is
 * configured (see .env.example). Without one, the widget falls back to
 * its simulated dispatch so the page stays demoable. */

import { useEffect, useMemo } from 'react';
import { MineralSelector } from './MineralSelector';
import { createDispatcher, type DispatchMode } from './lib/dispatch';

function configuredDispatcher() {
  const endpoint = (import.meta.env.VITE_RFQ_ENDPOINT as string | undefined)?.trim();
  if (!endpoint) return null;
  const rawMode = (import.meta.env.VITE_RFQ_MODE as string | undefined)?.trim();
  const mode: DispatchMode = rawMode === 'netlify' ? 'netlify' : 'json';
  return createDispatcher({ endpoint, mode });
}

export default function App() {
  const dispatcher = useMemo(configuredDispatcher, []);

  // Anything a previous session left pending or failed goes out again
  // on load — a flaky connection at the buyer's end can't cost a lead.
  useEffect(() => {
    void dispatcher?.flushQueue();
  }, [dispatcher]);

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
          {...(dispatcher ? { onSubmit: dispatcher.submit } : {})}
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
