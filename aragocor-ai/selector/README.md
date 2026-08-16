# Aragocor technical grade selector

A three-step React + Tailwind widget for the industrial mineral landing page:
industry → process & U.S. mesh sizing → tailored grade summary and sample-kit
request. Companion to the vanilla-JS sourcing desk one directory up; it shares
the same visual system, catalog figures and RFQ payload shape.

## Run it

```bash
cd aragocor-ai/selector
npm install
npm run dev        # dev server
npm test           # 26 unit tests (validation + grade derivation)
npm run build      # typecheck + production bundle in dist/
```

## Shape

```
src/
├── MineralSelector.tsx        # Orchestrator: step cursor, direction, spec state
├── App.tsx                    # Landing-page section around the widget (demo shell)
├── components/
│   ├── IndustryStep.tsx       # Step 1 — vertical card grid
│   ├── ProcessStep.tsx        # Step 2 — process radios, mesh group, notes
│   ├── MeshSelector.tsx       # Roving-tabindex radiogroup with µm equivalents
│   ├── GradeSummary.tsx       # Step 3 — the dark "mill certificate" card
│   ├── SampleRequestForm.tsx  # Lead capture with blur/submit validation
│   ├── SuccessPanel.tsx       # Confirmation with tracking reference
│   ├── StepIndicator.tsx      # Clickable three-stop progress rule
│   ├── StepPanel.tsx          # Shared frame + directional enter animation
│   ├── FormField.tsx          # Labelled control wired for aria-describedby
│   └── Icons.tsx              # Line art, currentColor, 24×24 grid
├── data/minerals.ts           # The product book: industries, processes, mesh
├── lib/
│   ├── grade.ts               # Specification → TailoredGrade (pure, tested)
│   ├── validation.ts          # Lead form rules (pure, tested)
│   ├── payload.ts             # Submit shape, mirrors ../js/rfq.js payload()
│   └── dispatch.ts            # Lead delivery: save-first queue, POST, retry
└── types.ts                   # Shared vocabulary
```

## Lead capture

Two ways to point the widget at an endpoint, resolved in this order:

1. **Build-time env** (see `.env.example`) — wins when set:

   ```bash
   VITE_RFQ_ENDPOINT=https://formspree.io/f/xxxxxxxx   # or your own handler
   VITE_RFQ_MODE=json                                  # json | netlify
   ```

2. **`public/rfq-config.json`** — fetched by the deployed page at load,
   so the endpoint can be changed by editing one file in the repo and
   pushing. No hosting-dashboard access, no env vars:

   ```json
   { "endpoint": "https://formspree.io/f/xxxxxxxx", "mode": "json" }
   ```

A submit awaits the config resolution, so a buyer who beats the config
fetch still delivers to the real endpoint. A missing or malformed
config file degrades to simulated dispatch, never a broken page.

Delivery order matches the sourcing desk deliberately:

1. The request is written to local storage with `status: pending`.
2. It POSTs to the endpoint.
3. It is marked `sent` or `failed`.

Because step 1 happens first, a dead network or a closed tab cannot lose a
lead. Anything still pending or failed is retried on the next page load, up
to five attempts. A rejected submit surfaces the endpoint's own error text
in the form's retryable banner, along with the tracking ID the request is
saved under.

- **JSON mode** — POSTs the payload (plus a Formspree `_subject`) as JSON.
  Works with Formspree, Getform, or any handler that returns CORS headers.
- **Netlify mode** — form-encoded POST to the site root. Deploy
  `netlify-sample.html` with the site so Netlify registers the
  `aragocor-sample-kit` field list at build time.

With no endpoint configured the widget simulates dispatch, so the page stays
demoable with no backend.

## Dropping it into a page

```tsx
import { MineralSelector } from './MineralSelector';
import { createDispatcher } from './lib/dispatch';

const dispatcher = createDispatcher({ endpoint: 'https://formspree.io/f/yourid' });

<MineralSelector
  onSubmit={dispatcher.submit}
  onStepChange={(index, id) => analytics.track('selector_step', { index, id })}
  defaultIndustry="glass"   // optional: skip step 1
/>
```

`onSubmit` may throw / reject — the form shows a retryable error banner and
keeps the draft. Call `dispatcher.flushQueue()` once on mount to re-send
anything a previous session left behind. The payload's key set matches
`RFQ.payload()` in `../js/rfq.js`, so the existing Formspree / Netlify /
own-handler pipeline accepts it unchanged.

## Changing the data

Push an entry onto `INDUSTRIES` in `src/data/minerals.ts` — it appears in the
step 1 grid, drives the step 2 process list and mesh range, and feeds the
step 3 summary with no other edits. Mesh cuts live in `MESH_CATALOG`; bulk
densities per cut in `src/lib/grade.ts`. Figures are typical production
ranges, not contractual specs — every shipment ships against its own COA.
