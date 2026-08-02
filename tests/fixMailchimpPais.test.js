
// Tests de la lógica pura del fix de PAIS en Mailchimp. `targetPais` no toca la
// red: decide el nuevo valor español para un PAIS legacy, o null si no cambia.

const { targetPais } = require('../scripts/fixMailchimpPais');

describe('targetPais (fix PAIS en Mailchimp)', () => {
  test('por defecto traduce solo "Spain" → "España" (case-insensitive)', () => {
    expect(targetPais('Spain')).toBe('España');
    expect(targetPais('spain')).toBe('España');
    expect(targetPais('  SPAIN  ')).toBe('España');
  });

  test('por defecto NO toca otros países legacy', () => {
    expect(targetPais('Mexico')).toBeNull();
    expect(targetPais('Colombia')).toBeNull();
  });

  test('con allCountries=true traduce cualquier legacy mapeable', () => {
    expect(targetPais('Mexico', true)).toBe('México');
    expect(targetPais('United States of America', true)).toBe('Estados Unidos');
    expect(targetPais('ES', true)).toBe('España'); // código ISO crudo también se corrige
  });

  test('devuelve null si ya está en español o no es mapeable', () => {
    expect(targetPais('España')).toBeNull();
    expect(targetPais('España', true)).toBeNull();
    expect(targetPais('Narnia', true)).toBeNull();
  });

  test('devuelve null para vacío, nulo o no-string', () => {
    expect(targetPais('')).toBeNull();
    expect(targetPais('   ')).toBeNull();
    expect(targetPais(null)).toBeNull();
    expect(targetPais(undefined)).toBeNull();
    expect(targetPais(42)).toBeNull();
  });
});
