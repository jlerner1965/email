/* validation.ts — lead form rules.
 *
 * Kept out of the component so the messages can be unit-tested and
 * changed by someone who is not reading JSX. Every rule returns a
 * sentence a buyer can act on; "Invalid input" is not a message. */

import type { LeadDraft, LeadErrors, LeadField } from '../types';

/* Deliberately permissive: one @, a dot in the domain, no whitespace.
   Anything stricter starts rejecting addresses that genuinely deliver. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Consumer mailbox providers. A sample kit costs real money to ship,
 *  so the desk routes on a company domain rather than a free mailbox. */
export const CONSUMER_EMAIL_DOMAINS: readonly string[] = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'qq.com',
  '163.com',
  '126.com',
];

export const NOTES_MAX_LENGTH = 400;

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase();
}

export function isConsumerEmail(email: string): boolean {
  return CONSUMER_EMAIL_DOMAINS.includes(emailDomain(email));
}

export function validateCompany(value: string): string | undefined {
  const company = value.trim();
  if (!company) return 'Company name is required.';
  if (company.length < 2) return 'Enter the full registered company name.';
  if (company.length > 120) return 'Company name is too long — 120 characters maximum.';
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'A work email is required — the technical packet is sent there.';
  if (!EMAIL_PATTERN.test(email)) return 'That email address is not formatted correctly.';
  if (isConsumerEmail(email)) {
    return 'Use your company domain. Free mailboxes cannot be verified for sample dispatch.';
  }
  return undefined;
}

export function validateShippingAddress(value: string): string | undefined {
  const address = value.trim();
  if (!address) return 'A shipping address is required for the sample kit.';
  if (address.length < 15) {
    return 'Include street, city, state or province, postal code and country.';
  }
  if (!/\d/.test(address)) {
    return 'Add the street number and postal code — couriers reject addresses without them.';
  }
  if (address.length > 400) return 'Shipping address is too long — 400 characters maximum.';
  return undefined;
}

const VALIDATORS: Readonly<Record<LeadField, (value: string) => string | undefined>> = {
  company: validateCompany,
  email: validateEmail,
  shippingAddress: validateShippingAddress,
};

export function validateField(field: LeadField, value: string): string | undefined {
  return VALIDATORS[field](value);
}

/** Full-form pass. Returns an object with a key per failing field; an
 *  empty object means the draft is submittable. */
export function validateLead(draft: LeadDraft): LeadErrors {
  const errors: LeadErrors = {};
  (Object.keys(VALIDATORS) as LeadField[]).forEach((field) => {
    const message = VALIDATORS[field](draft[field]);
    if (message) errors[field] = message;
  });
  return errors;
}

export function hasErrors(errors: LeadErrors): boolean {
  return Object.keys(errors).length > 0;
}
