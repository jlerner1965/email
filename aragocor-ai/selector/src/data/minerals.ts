/* minerals.ts — the product book for the selector.
 *
 * Figures are typical commercial production ranges for Aragocor
 * aragonite, consistent with the assay ranges published in
 * ../../js/catalog.js. Every shipment still ships against its own COA;
 * nothing rendered by this widget is a contractual specification.
 *
 * Add a vertical by pushing an entry onto INDUSTRIES. It appears in the
 * step 1 grid, drives the step 2 process list and mesh range, and feeds
 * the step 3 summary with no other edits. */

import type { Industry, IndustryId, MeshOption, MeshSize, ProcessOption } from '../types';

/** Base mineral. Aragonite, not calcite — hence orthorhombic. */
export const MINERAL = {
  name: 'Oolitic Aragonite',
  formula: 'CaCO₃',
  crystalStructure: 'Orthorhombic',
  spaceGroup: 'Pmcn',
  specificGravity: '2.93',
  mohs: '3.5 – 4.0',
  whiteness: '92 – 96 (ISO R457)',
  moisture: '≤ 0.30%',
} as const;

/** US standard sieve numbers with their nominal openings (ASTM E11). */
export const MESH_CATALOG: Readonly<Record<MeshSize, MeshOption>> = {
  20: { mesh: 20, micron: 850, note: 'Coarse granular — spreader grade, effectively dust free' },
  40: { mesh: 40, micron: 425, note: 'Granular — free flowing, blends without segregating' },
  60: { mesh: 60, micron: 250, note: 'Fine granular — the topdressing and filter-bed workhorse' },
  80: { mesh: 80, micron: 180, note: 'Coarse powder — fast reaction, still handles cleanly' },
  100: { mesh: 100, micron: 150, note: 'Powder — the standard agricultural and batch cut' },
  200: { mesh: 200, micron: 75, note: 'Fine powder — high surface area, rapid dissolution' },
  325: { mesh: 325, micron: 45, note: 'Micronised — filler grade for polymers and coatings' },
};

export const MESH_SIZES: readonly MeshSize[] = [20, 40, 60, 80, 100, 200, 325];

export const INDUSTRIES: readonly Industry[] = [
  {
    id: 'agriculture',
    title: 'Agriculture & Turf',
    icon: 'agriculture',
    code: 'AGT',
    valueProp:
      'Fast-reacting aragonite calcium that lifts soil pH without loading the profile with magnesium.',
    purity: [96.5, 98.0],
    omri: 'listed',
    processes: [
      {
        id: 'soil-ph',
        label: 'Soil pH correction & liming',
        detail: 'Broadcast or banded carbonate for acidic soils. Reaction rate tracks fineness.',
        recommendedMesh: 100,
      },
      {
        id: 'turf-topdressing',
        label: 'Turf topdressing & greens',
        detail: 'Works into sand rootzones without crusting or smothering the canopy.',
        recommendedMesh: 60,
      },
      {
        id: 'feed-supplement',
        label: 'Animal feed calcium supplement',
        detail: 'Free-flowing calcium source for layer, dairy and aquaculture rations.',
        recommendedMesh: 40,
      },
      {
        id: 'fertilizer-carrier',
        label: 'Fertilizer blend filler / carrier',
        detail: 'Granular carrier that holds prill integrity through blending and spreading.',
        recommendedMesh: 20,
      },
    ],
    meshRange: [20, 40, 60, 80, 100, 200],
    compliance: [
      'OMRI Listed for organic crop production',
      'AAFCO feed-ingredient documentation on request',
      'Heavy-metal screen (As, Cd, Pb, Hg) on every lot',
      'Certificate of Analysis per shipment',
    ],
  },
  {
    id: 'glass',
    title: 'Glass Manufacturing',
    icon: 'glass',
    code: 'GLS',
    valueProp:
      'Low-iron carbonate stabiliser that holds batch chemistry tight and keeps furnace seed count down.',
    purity: [97.0, 98.0],
    omri: 'not-applicable',
    processes: [
      {
        id: 'container-glass',
        label: 'Container glass batch',
        detail: 'Calcium stabiliser for flint and amber ware. The iron ceiling drives colour hold.',
        recommendedMesh: 60,
      },
      {
        id: 'float-glass',
        label: 'Float / flat glass batch',
        detail: 'Tight distribution to limit batch segregation on the way to the doghouse.',
        recommendedMesh: 40,
      },
      {
        id: 'fibreglass',
        label: 'Fibreglass & specialty melts',
        detail: 'Consistent LOI for stable pull rates across bushing lines.',
        recommendedMesh: 100,
      },
      {
        id: 'frit-glaze',
        label: 'Frit, glaze & enamel',
        detail: 'Finer cuts for rapid dissolution inside short smelting cycles.',
        recommendedMesh: 200,
      },
    ],
    meshRange: [40, 60, 80, 100, 200],
    compliance: [
      'Fe₂O₃ ≤ 0.045% — flint-glass iron ceiling',
      'LOI held to ± 0.4% lot to lot',
      'Batch-house moisture ≤ 0.20%',
      'Certificate of Analysis per shipment',
    ],
  },
  {
    id: 'water',
    title: 'Water Treatment',
    icon: 'water',
    code: 'WTR',
    valueProp:
      'Neutralising and remineralising media that buffers pH and puts hardness back into aggressive water.',
    purity: [97.0, 98.0],
    omri: 'listed',
    processes: [
      {
        id: 'ph-neutralisation',
        label: 'pH neutralisation filter bed',
        detail: 'Sacrificial contact media for low-pH, low-alkalinity source water.',
        recommendedMesh: 20,
      },
      {
        id: 'remineralisation',
        label: 'Remineralisation post-RO',
        detail: 'Restores calcium hardness and alkalinity downstream of membranes.',
        recommendedMesh: 40,
      },
      {
        id: 'effluent-dosing',
        label: 'Effluent & process water dosing',
        detail: 'Slurry-dosed alkalinity for industrial discharge compliance.',
        recommendedMesh: 200,
      },
      {
        id: 'aquaculture',
        label: 'Aquaculture & pond buffering',
        detail: 'Stabilises carbonate hardness across hatchery and pond systems.',
        recommendedMesh: 60,
      },
    ],
    meshRange: [20, 40, 60, 100, 200],
    compliance: [
      'OMRI Listed for organic operations',
      'NSF/ANSI 61 documentation available on request',
      'Heavy-metal screen (As, Cd, Pb, Hg) on every lot',
      'Certificate of Analysis per shipment',
    ],
  },
  {
    id: 'construction',
    title: 'Construction',
    icon: 'construction',
    code: 'CON',
    valueProp:
      'Consistent carbonate filler for mortar, asphalt and precast, delivered to a repeatable grading curve.',
    purity: [96.0, 97.5],
    omri: 'not-applicable',
    processes: [
      {
        id: 'dry-mortar',
        label: 'Dry mortar & render',
        detail: 'Grading-curve filler for plaster, render and tile adhesive.',
        recommendedMesh: 100,
      },
      {
        id: 'asphalt-filler',
        label: 'Asphalt mineral filler',
        detail: 'Void-filling fines that stiffen the mastic and cut rutting.',
        recommendedMesh: 200,
      },
      {
        id: 'concrete-addition',
        label: 'Concrete & precast addition',
        detail: 'Limestone addition for packing density and early-age strength.',
        recommendedMesh: 80,
      },
      {
        id: 'joint-compound',
        label: 'Joint compound & putty',
        detail: 'Low oil-absorption extender for sag-resistant compounds.',
        recommendedMesh: 325,
      },
    ],
    meshRange: [40, 80, 100, 200, 325],
    compliance: [
      'Grading curve held to the agreed envelope, lot to lot',
      'EN 12620 / ASTM C568 test data on request',
      'Moisture ≤ 0.30% at load port',
      'Certificate of Analysis per shipment',
    ],
  },
  {
    id: 'industrial',
    title: 'General Industrial',
    icon: 'industrial',
    code: 'IND',
    valueProp:
      'Functional carbonate filler for polymers, coatings and adhesives — coated or uncoated to suit your resin system.',
    purity: [96.5, 98.0],
    omri: 'on-request',
    processes: [
      {
        id: 'polymer-filler',
        label: 'Polymer & masterbatch filler',
        detail: 'PVC, PP and PE compounds. Stearate coating on request for dispersion.',
        recommendedMesh: 325,
      },
      {
        id: 'paint-extender',
        label: 'Paint & coatings extender',
        detail: 'Controls sheen, opacity and rheology in architectural systems.',
        recommendedMesh: 325,
      },
      {
        id: 'adhesive-sealant',
        label: 'Adhesive & sealant filler',
        detail: 'Rheology and cost control in polyurethane and silicone systems.',
        recommendedMesh: 200,
      },
      {
        id: 'rubber-compounding',
        label: 'Rubber compounding',
        detail: 'Semi-reinforcing filler for extruded and moulded goods.',
        recommendedMesh: 200,
      },
    ],
    meshRange: [80, 100, 200, 325],
    compliance: [
      'Oil absorption 14 – 22 g/100 g (ISO 787-5)',
      'Whiteness 92 – 96 (ISO R457)',
      'Stearic-acid surface treatment available at 1.0%',
      'Certificate of Analysis per shipment',
    ],
  },
];

/** Packing options, mirroring PACKS in ../../js/catalog.js. Coarse cuts
 *  ship in bulk; micronised cuts do not, because a liner cannot keep
 *  45 µm powder out of the container's corner welds. */
export const PACKING_COARSE = ['1.0 MT FIBC, lined', '50 kg PP woven, palletised', 'Bulk in container liner'];
export const PACKING_FINE = ['1.0 MT FIBC, lined', '25 kg paper sacks, palletised', '50 kg PP woven, palletised'];

export function findIndustry(id: IndustryId | null): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.id === id);
}

export function findProcess(industry: Industry, processId: string | null): ProcessOption | undefined {
  return industry.processes.find((process) => process.id === processId);
}
