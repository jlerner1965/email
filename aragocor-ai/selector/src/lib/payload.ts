/* payload.ts — the shape that leaves the browser.
 *
 * Deliberately close to RFQ.payload() in ../../js/rfq.js so a request
 * raised by this widget lands in the same Formspree / Netlify / own
 * handler pipeline as one raised by the sourcing desk, with no
 * translation layer on the receiving end. */

import type { LeadDraft, SampleRequestPayload, TailoredGrade } from '../types';
import { makeTrackingId } from './grade';

export const LEAD_SOURCE = 'Aragocor Minerals technical grade selector';

/** Inside an iframe the useful address is the embedding page, not the
 *  widget's own URL — same reasoning as the sourcing desk. */
export function currentPage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const embedded = window.location !== window.parent.location;
    return (embedded ? document.referrer : window.location.href) || '';
  } catch {
    // Cross-origin parent: the comparison throws, and the referrer is
    // the only thing we are allowed to see.
    return document.referrer || '';
  }
}

export function buildPayload(
  draft: LeadDraft,
  grade: TailoredGrade,
  notes: string,
  trackingId: string = makeTrackingId(),
): SampleRequestPayload {
  return {
    trackingId,
    raisedAt: new Date().toISOString(),
    source: LEAD_SOURCE,
    page: currentPage(),
    company: draft.company.trim(),
    email: draft.email.trim(),
    shippingAddress: draft.shippingAddress.trim(),
    industry: grade.industry.title,
    process: grade.process.label,
    gradeCode: grade.code,
    particleSize: `${grade.meshOption.mesh} Mesh (${grade.meshOption.micron} µm)`,
    micron: grade.meshOption.micron,
    purity: grade.purity,
    omri: grade.omri,
    notes: notes.trim(),
  };
}
