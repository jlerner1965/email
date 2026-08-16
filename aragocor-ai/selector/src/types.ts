/* types.ts — the shared vocabulary.
 *
 * Every component in the selector talks in these shapes, so a panel can
 * be lifted out and reused without dragging the orchestrator with it. */

export type IndustryId = 'agriculture' | 'glass' | 'water' | 'construction' | 'industrial';

export type IconId = IndustryId;

/** US standard sieve numbers we publish against (ASTM E11). */
export type MeshSize = 20 | 40 | 60 | 80 | 100 | 200 | 325;

/** Where a given industry sits on organic certification. */
export type OmriStatus = 'listed' | 'on-request' | 'not-applicable';

export interface MeshOption {
  /** US standard sieve number. */
  readonly mesh: MeshSize;
  /** Nominal sieve opening in microns (ASTM E11). */
  readonly micron: number;
  /** One line on what this cut is actually bought for. */
  readonly note: string;
}

export interface ProcessOption {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  /** Mesh we pre-select when this process is chosen. */
  readonly recommendedMesh: MeshSize;
}

export interface Industry {
  readonly id: IndustryId;
  readonly title: string;
  readonly valueProp: string;
  readonly icon: IconId;
  /** Segment used to build the grade code, e.g. AGM-AGT-200-OM. */
  readonly code: string;
  readonly processes: readonly ProcessOption[];
  /** Mesh cuts we actually produce for this vertical. */
  readonly meshRange: readonly MeshSize[];
  /** CaCO₃ assay range published for this vertical, in percent. */
  readonly purity: readonly [number, number];
  readonly omri: OmriStatus;
  /** Compliance and documentation lines shown on the summary card. */
  readonly compliance: readonly string[];
}

/** What steps 1 and 2 collect. */
export interface Specification {
  readonly industryId: IndustryId;
  readonly processId: string;
  readonly mesh: MeshSize;
  readonly applicationNotes: string;
}

export interface GradeParameter {
  readonly label: string;
  readonly value: string;
  /** Short provenance note — test method, standard, or caveat. */
  readonly note?: string;
}

/** The derived, display-ready grade shown in step 3. */
export interface TailoredGrade {
  readonly code: string;
  readonly title: string;
  readonly industry: Industry;
  readonly process: ProcessOption;
  readonly meshOption: MeshOption;
  readonly purity: string;
  readonly crystalStructure: string;
  readonly bulkDensity: string;
  readonly omri: OmriStatus;
  readonly omriLabel: string;
  /** The four figures the buyer is scanning for, shown as a stat band. */
  readonly headline: readonly GradeParameter[];
  /** Everything else, shown as an assay table. */
  readonly parameters: readonly GradeParameter[];
  readonly compliance: readonly string[];
  readonly packing: readonly string[];
}

/** The three fields the lead form collects, plus the honeypot.
 *  `website` is never shown to a person — it is the hidden trap field
 *  bots fill. Validation ignores it; dispatch maps it to the
 *  endpoint's spam-discard field. */
export interface LeadDraft {
  company: string;
  email: string;
  shippingAddress: string;
  website: string;
}

export type LeadField = Exclude<keyof LeadDraft, 'website'>;

export type LeadErrors = Partial<Record<LeadField, string>>;

/** Posted on submit. Mirrors the key set of RFQ.payload() in
 *  ../js/rfq.js so this widget can feed the existing lead pipeline
 *  without a translation layer on the receiving end. */
export interface SampleRequestPayload {
  readonly trackingId: string;
  readonly raisedAt: string;
  readonly source: string;
  readonly page: string;
  readonly company: string;
  readonly email: string;
  readonly shippingAddress: string;
  readonly industry: string;
  readonly process: string;
  readonly gradeCode: string;
  readonly particleSize: string;
  readonly micron: number;
  readonly purity: string;
  readonly omri: OmriStatus;
  readonly notes: string;
  /** Honeypot value. Empty for humans. Mapped on the wire to
   *  Formspree's `_gotcha` / Netlify's `bot-field`, never sent under
   *  this name. */
  readonly honeypot: string;
}
