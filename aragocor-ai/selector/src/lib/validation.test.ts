import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  isConsumerEmail,
  validateCompany,
  validateEmail,
  validateLead,
  validateShippingAddress,
} from './validation';

describe('validateCompany', () => {
  it('requires a value', () => {
    expect(validateCompany('')).toMatch(/required/i);
    expect(validateCompany('   ')).toMatch(/required/i);
  });

  it('rejects a single character', () => {
    expect(validateCompany('A')).toBeTruthy();
  });

  it('accepts a normal trading name', () => {
    expect(validateCompany('Vitro Envases North America')).toBeUndefined();
  });

  it('caps the length', () => {
    expect(validateCompany('x'.repeat(121))).toMatch(/120/);
  });
});

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('')).toMatch(/required/i);
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('nope')).toBeTruthy();
    expect(validateEmail('a@b')).toBeTruthy();
    expect(validateEmail('a b@c.com')).toBeTruthy();
    expect(validateEmail('a@.com')).toBeTruthy();
  });

  it('rejects consumer mailboxes with an actionable message', () => {
    expect(validateEmail('buyer@gmail.com')).toMatch(/company domain/i);
    expect(validateEmail('Buyer@Outlook.COM')).toMatch(/company domain/i);
  });

  it('accepts a company address', () => {
    expect(validateEmail('procurement@vitro.com')).toBeUndefined();
    expect(validateEmail('j.smith@plant.acme.co.uk')).toBeUndefined();
  });
});

describe('isConsumerEmail', () => {
  it('matches on domain, case-insensitively', () => {
    expect(isConsumerEmail('x@GMAIL.com')).toBe(true);
    expect(isConsumerEmail('x@corp-gmail.com')).toBe(false);
    expect(isConsumerEmail('no-at-sign')).toBe(false);
  });
});

describe('validateShippingAddress', () => {
  it('requires a value', () => {
    expect(validateShippingAddress('')).toMatch(/required/i);
  });

  it('rejects an address that is too short to ship to', () => {
    expect(validateShippingAddress('Ohio')).toBeTruthy();
  });

  it('insists on a street number or postal code', () => {
    expect(validateShippingAddress('Main Street, Springfield, Ohio, USA')).toMatch(/number|postal/i);
  });

  it('accepts a full address', () => {
    expect(
      validateShippingAddress('1400 Industrial Pkwy, Toledo, OH 43605, United States'),
    ).toBeUndefined();
  });
});

describe('validateLead', () => {
  it('returns one message per failing field', () => {
    const errors = validateLead({ company: '', email: 'bad', shippingAddress: '', website: '' });
    expect(Object.keys(errors).sort()).toEqual(['company', 'email', 'shippingAddress']);
    expect(hasErrors(errors)).toBe(true);
  });

  it('returns an empty object for a clean draft', () => {
    const errors = validateLead({
      company: 'Toledo Glassworks',
      email: 'batch@toledoglassworks.com',
      shippingAddress: '1400 Industrial Pkwy, Toledo, OH 43605, USA',
      website: '',
    });
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });
});
