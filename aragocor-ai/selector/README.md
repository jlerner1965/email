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
│   └── payload.ts             # Submit shape, mirrors ../js/rfq.js payload()
└── types.ts                   # Shared vocabulary
```

## Dropping it into a page

```tsx
import { MineralSelector } from './MineralSelector';

<MineralSelector
  onSubmit={(payload) => post('https://formspree.io/f/yourid', payload)}
  onStepChange={(index, id) => analytics.track('selector_step', { index, id })}
  defaultIndustry="glass"   // optional: skip step 1
/>
```

`onSubmit` may throw / reject — the form shows a retryable error banner and
keeps the draft. Without an `onSubmit` the widget simulates dispatch so the
flow is demoable with no backend. The payload's key set matches
`RFQ.payload()` in `../js/rfq.js`, so the existing Formspree / Netlify /
own-handler pipeline accepts it unchanged.

## Changing the data

Push an entry onto `INDUSTRIES` in `src/data/minerals.ts` — it appears in the
step 1 grid, drives the step 2 process list and mesh range, and feeds the
step 3 summary with no other edits. Mesh cuts live in `MESH_CATALOG`; bulk
densities per cut in `src/lib/grade.ts`. Figures are typical production
ranges, not contractual specs — every shipment ships against its own COA.
