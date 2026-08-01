
'use strict';

// Pasos 3-5 de la migración de `country` a ISO alpha-2 (docs/country-iso-migration-spec.md).
// Recorre los usuarios con `country` texto-libre y lo normaliza a código ISO
// 3166-1 alpha-2 usando el mapeo del Paso 2 (utils/constants/legacyCountryMap.js).
//
// SEGURIDAD DE BBDD (regla de oro del spec):
//   - Por defecto NO escribe: es un DRY-RUN que solo reporta.
//   - Solo escribe con el flag explícito --execute.
//   - NUNCA escribe null ni toca usuarios sin un valor legacy mapeable: los
//     que quedan sin mapear se REPORTAN, no se modifican.
//   - Ejecutar primero contra una copia local/de test, luego producción.
//
// Uso:
//   node scripts/migrateCountries.js            # dry-run (reporta, no escribe)
//   node scripts/migrateCountries.js --execute  # aplica los updates + verifica
//   node scripts/migrateCountries.js --verify   # solo verificación posterior

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../models/user');
const { toIsoCode } = require('../utils/constants/legacyCountryMap');

const MONGOOSE_URI = process.env.MONGOOSE_CONNECTION_STRING;
const ISO_ALPHA2 = /^[A-Z]{2}$/;

const EXECUTE = process.argv.includes('--execute');
const VERIFY_ONLY = process.argv.includes('--verify');

// Clasifica cada usuario con country no-nulo en una de tres cubetas.
function classify(users) {
  const toUpdate = []; // legacy → ISO distinto: se actualiza
  const alreadyIso = []; // ya está en ISO correcto: no se toca
  const unmapped = []; // valor presente pero no mapeable: se reporta, no se toca

  users.forEach((u) => {
    const raw = u.country;
    const iso = toIsoCode(raw);
    if (iso === null) {
      unmapped.push({ _id: String(u._id), email: u.email, before: raw });
    } else if (iso === raw) {
      alreadyIso.push({ _id: String(u._id), email: u.email, value: raw });
    } else {
      toUpdate.push({ _id: String(u._id), email: u.email, before: raw, after: iso });
    }
  });

  return { toUpdate, alreadyIso, unmapped };
}

// Verificación posterior (Paso 5): el distinct de country debe ser solo códigos
// de 2 letras mayúsculas (o null). Devuelve los valores que NO cumplen.
async function verify() {
  const grouped = await User.aggregate([
    { $group: { _id: '$country', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const offenders = grouped.filter(
    (g) => g._id !== null && g._id !== undefined && !(typeof g._id === 'string' && ISO_ALPHA2.test(g._id))
  );
  console.log('\n--- Verificación posterior (distinct de country) ---');
  grouped.forEach((g) => {
    const label = g._id === null || g._id === undefined ? '<null/ausente>' : JSON.stringify(g._id);
    console.log(`  ${label}  →  ${g.count}`);
  });
  if (offenders.length === 0) {
    console.log('\n✅ OK: todos los valores son ISO alpha-2 (o null). Migración consistente.');
  } else {
    console.log(`\n❌ ATENCIÓN: ${offenders.length} valor(es) no son ISO alpha-2:`);
    offenders.forEach((o) => console.log(`   ${JSON.stringify(o._id)} (${o.count} usuarios)`));
  }
  return offenders;
}

async function run() {
  if (!MONGOOSE_URI) {
    console.error('Migration aborted: MONGOOSE_CONNECTION_STRING is not set.');
    process.exit(1);
  }

  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGOOSE_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);
  console.log(`Mode: ${VERIFY_ONLY ? 'VERIFY-ONLY' : EXECUTE ? 'EXECUTE (escribe)' : 'DRY-RUN (no escribe)'}\n`);

  if (VERIFY_ONLY) {
    await verify();
    await mongoose.disconnect();
    return;
  }

  // Solo cargamos usuarios con country presente y no nulo: los null/ausentes se
  // dejan intactos por diseño (decisión confirmada, ver spec punto 3 y 5-frontend).
  const users = await User.find(
    { country: { $exists: true, $ne: null } },
    { country: 1, email: 1 }
  ).lean();

  const { toUpdate, alreadyIso, unmapped } = classify(users);

  console.log('--- Plan de migración ---');
  console.log(`Usuarios con country no-nulo:  ${users.length}`);
  console.log(`  A actualizar (legacy → ISO): ${toUpdate.length}`);
  console.log(`  Ya en ISO (sin cambio):      ${alreadyIso.length}`);
  console.log(`  Sin mapear (NO se tocan):    ${unmapped.length}`);

  if (toUpdate.length) {
    console.log('\nActualizaciones previstas:');
    toUpdate.forEach((u) => console.log(`  ${u.email}: ${JSON.stringify(u.before)} → ${u.after}`));
  }
  if (unmapped.length) {
    console.log('\n⚠️  Valores SIN MAPEAR (revisar caso a caso, quedan como están):');
    unmapped.forEach((u) => console.log(`  ${u.email}: ${JSON.stringify(u.before)}`));
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN: no se ha escrito nada. Reejecuta con --execute para aplicar.');
    await mongoose.disconnect();
    return;
  }

  // --- Ejecución real ---
  // Log antes/después por usuario, para rollback manual si algo falla.
  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `country-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

  const applied = [];
  for (const u of toUpdate) {
    await User.updateOne({ _id: u._id }, { $set: { country: u.after } });
    applied.push(u);
  }

  fs.writeFileSync(logPath, JSON.stringify({ appliedAt: new Date().toISOString(), applied, unmapped }, null, 2));
  console.log(`\n✅ Aplicados ${applied.length} updates. Log antes/después: ${logPath}`);

  await verify();
  await mongoose.disconnect();
}

// Solo auto-ejecuta cuando se corre directamente (node scripts/migrateCountries.js).
// Al ser `require`-ido desde los tests, no conecta a la BBDD: solo expone la
// lógica pura (`classify`) para poder testearla con datos "sucios".
if (require.main === module) {
  run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { classify };
