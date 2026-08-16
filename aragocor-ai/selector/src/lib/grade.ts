/* grade.ts — turns a Specification into the technical summary shown in
 * step 3. Pure functions, no React, so the numbers can be unit-tested
 * and reused by the RFQ email body without importing a component. */

import {
  MESH_CATALOG,
  MINERAL,
  PACKING_COARSE,
  PACKING_FINE,
  findIndustry,
  findProcess,
} from '../data/minerals';
import type {
  GradeParameter,
  Industry,
  MeshSize,
  OmriStatus,
  ProcessOption,
  Specification,
  TailoredGrade,
} from '../types';

/** Bulk density as packed, t/m³. Finer grinds trap more air, so the
 *  cube goes up as the mesh number goes up — this drives the freight
 *  estimate, so it matters more than it looks. */
const BULK_DENSITY: Readonly<Record<MeshSize, number>> = {
  20: 1.44,
  40: 1.38,
  60: 1.32,
  80: 1.26,
  100: 1.21,
  200: 1.12,
  325: 1.02,
};

const OMRI_LABEL: Readonly<Record<OmriStatus, string>> = {
  listed: 'OMRI Listed',
  'on-request': 'OMRI Listed — on request',
  'not-applicable': 'Technical grade — not applicable',
};

/** Fineness raises reactive surface area, which is what an agronomist
 *  or a water engineer is actually buying. Rough but directionally
 *  honest figures for a 96–98% CaCO₃ ground carbonate. */
function reactiveSurface(mesh: MeshSize): string {
  if (mesh <= 40) return '0.4 – 0.8 m²/g';
  if (mesh <= 100) return '0.9 – 1.6 m²/g';
  if (mesh <= 200) return '1.8 – 2.6 m²/g';
  return '2.8 – 4.0 m²/g';
}

/** Percentage passing the nominated sieve. Coarser cuts are screened,
 *  finer cuts are milled, and milled cuts hold a tighter pass rate. */
function passRate(mesh: MeshSize): string {
  return mesh >= 200 ? '≥ 98% passing' : '≥ 95% passing';
}

export function bulkDensityFor(mesh: MeshSize): number {
  return BULK_DENSITY[mesh];
}

export function formatPurity(range: readonly [number, number]): string {
  return `${range[0].toFixed(1)} – ${range[1].toFixed(1)}% CaCO₃`;
}

/** AGM-AGT-200-OM — house, vertical, sieve, organic suffix. */
export function buildGradeCode(industry: Industry, mesh: MeshSize, omri: OmriStatus): string {
  const suffix = omri === 'listed' ? '-OM' : '';
  return `AGM-${industry.code}-${mesh}${suffix}`;
}

/** The four figures a technical buyer scans for first. */
export function buildHeadline(industry: Industry, mesh: MeshSize): readonly GradeParameter[] {
  return [
    {
      label: 'Purity',
      value: formatPurity(industry.purity),
      note: 'EDTA titration, dry basis',
    },
    {
      label: 'Crystal structure',
      value: MINERAL.crystalStructure,
      note: `Aragonite · space group ${MINERAL.spaceGroup}`,
    },
    {
      label: 'Bulk density',
      value: `${bulkDensityFor(mesh).toFixed(2)} t/m³`,
      note: 'As packed — sets the freight cube',
    },
    {
      label: 'Organic compliance',
      value: OMRI_LABEL[industry.omri],
      note:
        industry.omri === 'listed'
          ? 'Organic Materials Review Institute'
          : industry.omri === 'on-request'
            ? 'Listed grades available on request'
            : 'Industrial process input',
    },
  ];
}

export function buildParameters(mesh: MeshSize): readonly GradeParameter[] {
  return [
    {
      label: 'Particle size',
      value: `${mesh} Mesh · ${MESH_CATALOG[mesh].micron} µm`,
      note: passRate(mesh),
    },
    {
      label: 'Reactive surface area',
      value: reactiveSurface(mesh),
      note: 'BET, nitrogen adsorption',
    },
    {
      label: 'Specific gravity',
      value: MINERAL.specificGravity,
      note: `Mohs ${MINERAL.mohs}`,
    },
    {
      label: 'Whiteness',
      value: MINERAL.whiteness,
      note: 'Brightness varies by seam',
    },
    {
      label: 'Free moisture',
      value: MINERAL.moisture,
      note: 'At load port, sealed liner',
    },
  ];
}

export function packingFor(mesh: MeshSize): readonly string[] {
  return mesh >= 200 ? PACKING_FINE : PACKING_COARSE;
}

/** Resolve a Specification into everything step 3 renders. Returns null
 *  when the spec points at an industry or process that no longer
 *  exists, so a stale saved draft degrades to "start again" rather than
 *  throwing inside render. */
export function deriveGrade(spec: Specification): TailoredGrade | null {
  const industry = findIndustry(spec.industryId);
  if (!industry) return null;

  const process = findProcess(industry, spec.processId);
  if (!process) return null;

  const meshOption = MESH_CATALOG[spec.mesh];
  if (!meshOption) return null;

  return {
    code: buildGradeCode(industry, spec.mesh, industry.omri),
    title: `${MINERAL.name} ${spec.mesh} Mesh · ${industry.title}`,
    industry,
    process,
    meshOption,
    purity: formatPurity(industry.purity),
    crystalStructure: MINERAL.crystalStructure,
    bulkDensity: `${bulkDensityFor(spec.mesh).toFixed(2)} t/m³`,
    omri: industry.omri,
    omriLabel: OMRI_LABEL[industry.omri],
    headline: buildHeadline(industry, spec.mesh),
    parameters: buildParameters(spec.mesh),
    compliance: industry.compliance,
    packing: packingFor(spec.mesh),
  };
}

/** If the buyer has not touched the mesh control, follow the process
 *  recommendation. Once they have, leave their choice alone. */
export function defaultMeshFor(process: ProcessOption, industry: Industry): MeshSize {
  return industry.meshRange.includes(process.recommendedMesh)
    ? process.recommendedMesh
    : (industry.meshRange[0] ?? 100);
}

/** RFQ-AGM-482913 — same shape as id() in ../../js/rfq.js, so tracking
 *  IDs raised here are indistinguishable from the sourcing desk's. */
export function makeTrackingId(random: () => number = Math.random): string {
  return `RFQ-AGM-${String(Math.floor(100000 + random() * 900000))}`;
}
