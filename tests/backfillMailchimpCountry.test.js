
// Tests de la construcción de operaciones del backfill de PAIS en Mailchimp.
// `buildOperations` es pura (sin red ni BBDD).

const crypto = require('crypto');
const { buildOperations } = require('../scripts/backfillMailchimpCountry');

const LIST = 'list123';
const md5 = (email) => crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

describe('buildOperations (backfill Mailchimp PAIS)', () => {
  test('genera una op PATCH por contacto con país mapeable', () => {
    const users = [
      { email: 'A@X.com', country: 'ES' },
      { email: 'b@x.com', country: 'Spain' }, // legacy → España
    ];
    const { operations, skipped } = buildOperations(users, LIST);

    expect(skipped).toHaveLength(0);
    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({
      method: 'PATCH',
      path: `/lists/${LIST}/members/${md5('A@X.com')}`,
    });
    expect(JSON.parse(operations[0].body)).toEqual({ merge_fields: { PAIS: 'España' } });
    expect(JSON.parse(operations[1].body)).toEqual({ merge_fields: { PAIS: 'España' } });
  });

  test('el body SOLO contiene merge_fields.PAIS: nunca status/FNAME/GENERO/FORMATO', () => {
    const { operations } = buildOperations([{ email: 'a@x.com', country: 'MX' }], LIST);
    const body = JSON.parse(operations[0].body);

    expect(Object.keys(body)).toEqual(['merge_fields']);
    expect(Object.keys(body.merge_fields)).toEqual(['PAIS']);
    expect(body).not.toHaveProperty('status');
    expect(body.merge_fields).not.toHaveProperty('FNAME');
    expect(body.merge_fields).not.toHaveProperty('GENERO');
    expect(body.merge_fields).not.toHaveProperty('FORMATO');
  });

  test('salta (no genera op) contactos sin país mapeable', () => {
    const users = [
      { email: 'a@x.com', country: 'Narnia' },
      { email: 'b@x.com', country: '' },
      { email: 'c@x.com', country: null },
    ];
    const { operations, skipped } = buildOperations(users, LIST);

    expect(operations).toHaveLength(0);
    expect(skipped.map((s) => s.email)).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });

  test('el subscriber hash usa el email en minúsculas', () => {
    const { operations } = buildOperations([{ email: 'MixedCase@X.com', country: 'ES' }], LIST);
    expect(operations[0].path).toBe(`/lists/${LIST}/members/${md5('mixedcase@x.com')}`);
  });
});
