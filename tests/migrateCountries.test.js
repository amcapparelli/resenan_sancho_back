
// Tests de la lógica pura de la migración de `country` a ISO alpha-2.
// `classify` no toca la BBDD (el script solo conecta cuando se ejecuta
// directamente), así que se puede probar con datasets "sucios" en memoria.

const { classify } = require('../scripts/migrateCountries');
const { toIsoCode } = require('../utils/constants/legacyCountryMap');

describe('toIsoCode', () => {
  test('mapea valores legacy conocidos a su código ISO', () => {
    expect(toIsoCode('Spain')).toBe('ES');
    expect(toIsoCode('United States of America')).toBe('US');
    expect(toIsoCode('United States')).toBe('US');
    expect(toIsoCode('Venezuela (Bolivarian Republic of)')).toBe('VE');
  });

  test('tolera mayúsculas y espacios en los valores legacy', () => {
    expect(toIsoCode('spain')).toBe('ES');
    expect(toIsoCode('  Spain  ')).toBe('ES');
  });

  test('deja pasar un código ISO ya válido (normalizando mayúsculas)', () => {
    expect(toIsoCode('ES')).toBe('ES');
    expect(toIsoCode('es')).toBe('ES');
  });

  test('devuelve null para vacío, nulo o no-string', () => {
    expect(toIsoCode('')).toBeNull();
    expect(toIsoCode('   ')).toBeNull();
    expect(toIsoCode(null)).toBeNull();
    expect(toIsoCode(undefined)).toBeNull();
    expect(toIsoCode(42)).toBeNull();
  });

  test('devuelve null para un valor no mapeable', () => {
    expect(toIsoCode('Narnia')).toBeNull();
  });
});

describe('classify (migración de country)', () => {
  test('separa a-actualizar, ya-ISO y sin-mapear con datos sucios', () => {
    const users = [
      { _id: 1, email: 'a@x.com', country: 'Spain' }, // legacy → update
      { _id: 2, email: 'b@x.com', country: 'United States of America' }, // legacy → update
      { _id: 3, email: 'c@x.com', country: 'ES' }, // ya-ISO → sin cambio
      { _id: 4, email: 'd@x.com', country: '' }, // vacío → sin mapear
      { _id: 5, email: 'e@x.com', country: 'Narnia' }, // no mapeable → sin mapear
      { _id: 6, email: 'f@x.com', country: '  Mexico ' }, // legacy con espacios → update
    ];

    const { toUpdate, alreadyIso, unmapped } = classify(users);

    expect(toUpdate).toEqual([
      { _id: '1', email: 'a@x.com', before: 'Spain', after: 'ES' },
      { _id: '2', email: 'b@x.com', before: 'United States of America', after: 'US' },
      { _id: '6', email: 'f@x.com', before: '  Mexico ', after: 'MX' },
    ]);
    expect(alreadyIso).toEqual([{ _id: '3', email: 'c@x.com', value: 'ES' }]);
    expect(unmapped).toEqual([
      { _id: '4', email: 'd@x.com', before: '' },
      { _id: '5', email: 'e@x.com', before: 'Narnia' },
    ]);
  });

  test('nunca produce un update hacia null (los sin-mapear no se tocan)', () => {
    const users = [{ _id: 9, email: 'z@x.com', country: 'Narnia' }];
    const { toUpdate } = classify(users);
    expect(toUpdate).toHaveLength(0);
  });
});
