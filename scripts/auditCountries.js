
'use strict';

// Paso 1 de la migración de `country` a ISO 3166-1 alpha-2 (ver
// docs/country-iso-migration-spec.md). AUDITORÍA, SOLO LECTURA: recorre la
// colección de usuarios y saca un distinct de `country` con conteos. No escribe
// nada, así que es seguro correrlo directamente contra producción.
//
// Uso:
//   node scripts/auditCountries.js
//
// Revisa la salida manualmente ANTES de construir el mapeo (Paso 2): aquí es
// donde aparecen typos, vacíos, nombres en español ya colados, etc.

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const User = require('../models/user');

const MONGOOSE_URI = process.env.MONGOOSE_CONNECTION_STRING;
const ISO_ALPHA2 = /^[A-Z]{2}$/;

async function audit() {
  if (!MONGOOSE_URI) {
    console.error('Audit aborted: MONGOOSE_CONNECTION_STRING is not set.');
    process.exit(1);
  }

  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGOOSE_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);
  console.log('(read-only audit — no documents will be modified)\n');

  const totalUsers = await User.countDocuments({});

  // Agrupa por el valor EXACTO de `country` (sin normalizar) para que los typos
  // y variaciones de mayúsculas/acentos salgan como filas distintas.
  const grouped = await User.aggregate([
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  const rows = grouped.map((g) => {
    const raw = g._id;
    let category;
    if (raw === null || raw === undefined) {
      category = 'NULL/AUSENTE';
    } else if (typeof raw !== 'string' || raw.trim() === '') {
      category = 'VACÍO';
    } else if (ISO_ALPHA2.test(raw)) {
      category = 'YA-ISO';
    } else {
      category = 'LEGACY (a mapear)';
    }
    return { value: raw, count: g.count, category };
  });

  // Impresión en formato tabla, alineada, para revisión manual.
  const valueLabel = (v) => {
    if (v === null || v === undefined) return '<null/ausente>';
    if (v === '') return '<cadena vacía>';
    return JSON.stringify(v); // muestra comillas y espacios ocultos
  };

  const pad = Math.max(...rows.map((r) => valueLabel(r.value).length), 'VALOR'.length);
  console.log(`${'VALOR'.padEnd(pad)}  ${'COUNT'.padStart(6)}  CATEGORÍA`);
  console.log(`${'-'.repeat(pad)}  ${'-'.repeat(6)}  ${'-'.repeat(18)}`);
  rows.forEach((r) => {
    console.log(`${valueLabel(r.value).padEnd(pad)}  ${String(r.count).padStart(6)}  ${r.category}`);
  });

  // Resumen por categoría.
  const summary = rows.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.count;
    return acc;
  }, {});

  console.log('\n--- Resumen ---');
  console.log(`Usuarios totales:          ${totalUsers}`);
  console.log(`Valores distintos:         ${rows.length}`);
  Object.entries(summary).forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(20)} ${String(count).padStart(6)} usuarios`);
  });

  const legacyValues = rows
    .filter((r) => r.category === 'LEGACY (a mapear)')
    .map((r) => r.value);
  if (legacyValues.length) {
    console.log('\nValores LEGACY a incluir en LEGACY_COUNTRY_MAP (Paso 2):');
    console.log(JSON.stringify(legacyValues, null, 2));
  }

  await mongoose.disconnect();
}

audit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
