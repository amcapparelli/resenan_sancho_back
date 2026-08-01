
'use strict';

// Generador (dev-time) del catálogo estático utils/constants/countries.js:
// mapa código ISO 3166-1 alpha-2 → nombre en español. Los nombres salen de
// `Intl.DisplayNames` con locale 'es' (CLDR, incluido en el ICU de Node 22),
// así que NO añade dependencias nuevas.
//
// El fichero generado se commitea y es la ÚNICA fuente de verdad para traducir
// código ISO → nombre español (backfill de Mailchimp y sync futura). Se
// materializa en vez de llamar a Intl en runtime para que el valor guardado en
// Mailchimp no cambie si cambia la versión de ICU.
//
// Uso: node scripts/generateCountries.js   (reescribe utils/constants/countries.js)

const fs = require('fs');
const path = require('path');

// ISO 3166-1 alpha-2, códigos oficialmente asignados.
const ISO_ALPHA2_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU',
  'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL',
  'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC',
  'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV',
  'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG',
  'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD',
  'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT',
  'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM',
  'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH',
  'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK',
  'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH',
  'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR',
  'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR',
  'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC',
  'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL',
  'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY',
  'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA',
  'ZM', 'ZW',
];

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

const entries = ISO_ALPHA2_CODES.map((code) => {
  const name = regionNames.of(code);
  if (!name || name === code) {
    // Intl devuelve el propio código si no conoce el nombre: aviso y omito.
    console.warn(`WARN: sin nombre en español para ${code}, se omite`);
    return null;
  }
  return [code, name];
}).filter(Boolean);

// Ordena por nombre español con localeCompare('es') (respeta acentos y ñ).
entries.sort((a, b) => a[1].localeCompare(b[1], 'es'));

// Serializa como literal de string con comillas simples (regla ESLint del repo),
// escapando backslashes y comillas simples embebidas.
const singleQuoted = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

const body = entries
  .map(([code, name]) => `  ${code}: ${singleQuoted(name)},`)
  .join('\n');

const output = `'use strict';

// GENERADO por scripts/generateCountries.js — NO editar a mano.
// Mapa código ISO 3166-1 alpha-2 → nombre en español (CLDR/ICU, locale 'es').
// Única fuente de verdad para traducir el país guardado (ISO) al nombre español
// que se envía a Mailchimp (ver docs/country-iso-migration-spec.md, puntos 6.1 y 8).
// Ordenado alfabéticamente por nombre español.

const COUNTRY_NAMES_ES = {
${body}
};

const ISO_ALPHA2 = /^[A-Z]{2}$/;

// true si el código tiene formato ISO alpha-2 (2 letras) y existe en el catálogo.
function isValidIsoAlpha2(code) {
  return typeof code === 'string' && ISO_ALPHA2.test(code) && Object.prototype.hasOwnProperty.call(COUNTRY_NAMES_ES, code);
}

// Traduce un código ISO alpha-2 a su nombre en español, o null si no se conoce.
function isoToSpanishName(code) {
  if (typeof code !== 'string') return null;
  const upper = code.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(COUNTRY_NAMES_ES, upper) ? COUNTRY_NAMES_ES[upper] : null;
}

module.exports = { COUNTRY_NAMES_ES, isValidIsoAlpha2, isoToSpanishName };
`;

const outPath = path.join(__dirname, '..', 'utils', 'constants', 'countries.js');
fs.writeFileSync(outPath, output);
console.log(`Wrote ${entries.length} countries to ${outPath}`);
