'use strict';

// Paso 2 de la migración de `country` a ISO alpha-2 (docs/country-iso-migration-spec.md).
// Mapeo de los valores texto-libre que REALMENTE existen en la BBDD (según la
// auditoría del Paso 1) → código ISO 3166-1 alpha-2. Construido a partir del
// listado auditado, NO de una lista genérica de países.
//
// Los nombres verbosos (p.ej. "Venezuela (Bolivarian Republic of)") son los que
// devolvía restcountries.com y guardaba el frontend viejo: se incluyen tal cual
// para que la capa de compatibilidad de entrada (punto 4) también los normalice
// si un frontend viejo los sigue enviando durante el deploy no atómico.
const LEGACY_COUNTRY_MAP = {
  'Spain': 'ES',
  'Mexico': 'MX',
  'Colombia': 'CO',
  'Argentina': 'AR',
  'Peru': 'PE',
  'Chile': 'CL',
  'Dominican Republic': 'DO',
  'Portugal': 'PT',
  'Uruguay': 'UY',
  'Venezuela (Bolivarian Republic of)': 'VE',
  'Bolivia (Plurinational State of)': 'BO',
  'Ecuador': 'EC',
  'Guatemala': 'GT',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'United Kingdom of Great Britain and Northern Ireland': 'GB',
  'United States': 'US',
  'United States of America': 'US',
};

const ISO_ALPHA2 = /^[A-Z]{2}$/;

// Índice normalizado (clave en minúsculas y sin espacios extra) para que la
// búsqueda tolere variaciones de mayúsculas/espacios ("spain", " Spain ").
const NORMALIZED_MAP = Object.entries(LEGACY_COUNTRY_MAP).reduce((acc, [name, code]) => {
  acc[name.trim().toLowerCase()] = code;
  return acc;
}, {});

// Normaliza un valor de `country` de entrada a código ISO alpha-2, o devuelve
// null si no se puede resolver (vacío, nulo, o legacy no contemplado).
//
// Reglas, en orden:
//   1. null/undefined/no-string/vacío → null (queda sin país).
//   2. Ya es ISO alpha-2 (2 letras) → se devuelve en mayúsculas tal cual. No se
//      valida contra la lista cerrada de países (coherente con el schema, que
//      valida formato, no pertenencia), para no rechazar códigos ISO nuevos.
//   3. Es un valor legacy conocido → su código ISO.
//   4. Cualquier otra cosa → null (sin mapear: se decide caso a caso).
function toIsoCode(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const upper = trimmed.toUpperCase();
  if (ISO_ALPHA2.test(upper)) return upper;
  const mapped = NORMALIZED_MAP[trimmed.toLowerCase()];
  return mapped || null;
}

module.exports = { LEGACY_COUNTRY_MAP, toIsoCode };
