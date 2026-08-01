'use strict';

const { toIsoCode } = require('./constants/legacyCountryMap');
const { isoToSpanishName } = require('./constants/countries');

// Resuelve el valor `country` guardado (ISO o legacy) a su nombre en español,
// o null si no se conoce. Estricto: sin fallback. Lo usa el backfill para
// SALTARSE contactos sin país mapeable (no sobreescribir con 'N/A').
//   - Código ISO ('ES')             → 'España'
//   - Legacy texto-libre ('Spain')  → 'España' (vía toIsoCode)
//   - Legacy no mapeable / vacío / null → null
function resolveSpanishCountry(value) {
  return isoToSpanishName(toIsoCode(value));
}

// Traduce el valor `country` guardado del usuario al nombre en español que se
// envía al merge field PAIS de Mailchimp (docs/country-iso-migration-spec.md,
// puntos 6.1 y 8). Nunca se envía el código ISO en crudo.
//
// Es robusto durante el deploy no atómico / antes de correr la migración:
//   - Código ISO ('ES')                → 'España'
//   - Legacy texto-libre ('Spain')     → 'España' (vía toIsoCode)
//   - Legacy no mapeable ('Narnia')    → 'Narnia' (se preserva tal cual)
//   - Vacío / null / no-string         → 'N/A' (fallback histórico existente)
function countryForMailchimp(value) {
  const spanish = resolveSpanishCountry(value);
  if (spanish) return spanish;
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return 'N/A';
}

module.exports = { countryForMailchimp, resolveSpanishCountry };
