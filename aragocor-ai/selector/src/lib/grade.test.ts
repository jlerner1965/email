import { describe, expect, it } from 'vitest';
import { INDUSTRIES, MESH_SIZES, findIndustry } from '../data/minerals';
import {
  buildGradeCode,
  bulkDensityFor,
  defaultMeshFor,
  deriveGrade,
  makeTrackingId,
} from './grade';
import type { Specification } from '../types';

const agriculture = findIndustry('agriculture')!;
const glass = findIndustry('glass')!;

describe('catalog integrity', () => {
  it('every process recommends a mesh its own industry produces', () => {
    for (const industry of INDUSTRIES) {
      for (const process of industry.processes) {
        expect(
          industry.meshRange,
          `${industry.id}/${process.id} recommends ${process.recommendedMesh}`,
        ).toContain(process.recommendedMesh);
      }
    }
  });

  it('every industry publishes a purity inside 96–98%', () => {
    for (const industry of INDUSTRIES) {
      const [low, high] = industry.purity;
      expect(low).toBeGreaterThanOrEqual(96);
      expect(high).toBeLessThanOrEqual(98);
      expect(low).toBeLessThan(high);
    }
  });

  it('every mesh range stays inside the published sieve set', () => {
    for (const industry of INDUSTRIES) {
      for (const mesh of industry.meshRange) {
        expect(MESH_SIZES).toContain(mesh);
      }
    }
  });
});

describe('buildGradeCode', () => {
  it('appends the organic suffix only for OMRI-listed verticals', () => {
    expect(buildGradeCode(agriculture, 100, agriculture.omri)).toBe('AGM-AGT-100-OM');
    expect(buildGradeCode(glass, 60, glass.omri)).toBe('AGM-GLS-60');
  });
});

describe('bulkDensityFor', () => {
  it('falls as the grind gets finer', () => {
    expect(bulkDensityFor(20)).toBeGreaterThan(bulkDensityFor(100));
    expect(bulkDensityFor(100)).toBeGreaterThan(bulkDensityFor(325));
  });
});

describe('deriveGrade', () => {
  const spec: Specification = {
    industryId: 'agriculture',
    processId: 'soil-ph',
    mesh: 100,
    applicationNotes: '',
  };

  it('derives the full summary from a valid spec', () => {
    const grade = deriveGrade(spec);
    expect(grade).not.toBeNull();
    expect(grade!.code).toBe('AGM-AGT-100-OM');
    expect(grade!.crystalStructure).toBe('Orthorhombic');
    expect(grade!.purity).toBe('96.5 – 98.0% CaCO₃');
    expect(grade!.bulkDensity).toBe('1.21 t/m³');
    expect(grade!.omriLabel).toBe('OMRI Listed');
    expect(grade!.headline).toHaveLength(4);
    expect(grade!.headline.map((p) => p.label)).toEqual([
      'Purity',
      'Crystal structure',
      'Bulk density',
      'Organic compliance',
    ]);
  });

  it('returns null rather than throwing on a stale spec', () => {
    expect(deriveGrade({ ...spec, processId: 'retired-process' })).toBeNull();
    expect(deriveGrade({ ...spec, industryId: 'mining' as never })).toBeNull();
  });

  it('switches to fine packing at 200 mesh and above', () => {
    const coarse = deriveGrade({ ...spec, mesh: 100 })!;
    const fine = deriveGrade({ ...spec, mesh: 200 })!;
    expect(coarse.packing.join(' ')).toMatch(/bulk/i);
    expect(fine.packing.join(' ')).not.toMatch(/bulk/i);
  });
});

describe('defaultMeshFor', () => {
  it('follows the process recommendation', () => {
    const process = agriculture.processes.find((p) => p.id === 'turf-topdressing')!;
    expect(defaultMeshFor(process, agriculture)).toBe(60);
  });
});

describe('makeTrackingId', () => {
  it('matches the sourcing-desk format', () => {
    expect(makeTrackingId()).toMatch(/^RFQ-AGM-\d{6}$/);
  });

  it('never produces fewer than six digits', () => {
    expect(makeTrackingId(() => 0)).toBe('RFQ-AGM-100000');
    expect(makeTrackingId(() => 0.9999999)).toBe('RFQ-AGM-999999');
  });
});
