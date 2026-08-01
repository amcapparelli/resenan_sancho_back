
'use strict';

// Paso 6 de la migración de `country` (docs/country-iso-migration-spec.md, 6.1).
// Backfill del merge field PAIS en Mailchimp: pone el nombre en español a partir
// del país guardado en la BBDD, reutilizando el mismo mapeo del Paso 2.
//
// GARANTÍAS DE SEGURIDAD (spec 6.1 y tabla de riesgos):
//   - Función AISLADA: NO reutiliza la sync de registerReviewer. El body de cada
//     operación es EXACTAMENTE { merge_fields: { PAIS: <nombre ES> } }.
//     Nunca envía FNAME, GENERO, FORMATO ni el campo `status` → no puede
//     desuscribir a nadie ni borrar género/formato.
//   - Usa PATCH (actualización parcial), no PUT.
//   - Usa el endpoint de Batch Operations (una sola llamada) para evitar rate limits.
//   - Salta los contactos sin país mapeable (no sobreescribe con 'N/A').
//   - Por defecto DRY-RUN: no llama a Mailchimp. Solo con --execute.
//   - Trabaja sobre LIST_UNIQUE_ID (la lista de reseñadores, donde vive PAIS).
//
// Uso:
//   node scripts/backfillMailchimpCountry.js                 # dry-run (no red)
//   node scripts/backfillMailchimpCountry.js --limit 2       # dry-run de 2 contactos
//   node scripts/backfillMailchimpCountry.js --execute --limit 2   # prueba real 1-2 contactos
//   node scripts/backfillMailchimpCountry.js --execute       # batch completo

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const { resolveSpanishCountry } = require('../utils/mailchimpCountry');

const MONGOOSE_URI = process.env.MONGOOSE_CONNECTION_STRING;
const mailchimpInstance = process.env.MAIL_CHIMP_INSTANCE;
const listId = process.env.LIST_UNIQUE_ID;
const mailchimpApiKey = process.env.MAIL_CHIMP_API_KEY;
const authHeader = 'Basic ' + Buffer.from('anystring:' + mailchimpApiKey).toString('base64');

const EXECUTE = process.argv.includes('--execute');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : null;

// Construye las operaciones del batch. PURO (sin red ni BBDD) → testeable.
// Cada op toca SOLO merge_fields.PAIS vía PATCH. Los contactos sin país
// mapeable se devuelven en `skipped` y NO generan operación.
function buildOperations(users, list) {
  const operations = [];
  const skipped = [];
  users.forEach((u) => {
    const name = resolveSpanishCountry(u.country);
    if (!name) {
      skipped.push({ email: u.email, country: u.country });
      return;
    }
    const subscriberHash = crypto.createHash('md5').update(String(u.email).toLowerCase()).digest('hex');
    operations.push({
      method: 'PATCH',
      path: `/lists/${list}/members/${subscriberHash}`,
      body: JSON.stringify({ merge_fields: { PAIS: name } }),
      operation_id: u.email, // para identificar fallos por contacto en los resultados
    });
  });
  return { operations, skipped };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Envía el batch y espera a que termine, devolviendo el resumen de Mailchimp.
async function submitBatch(operations) {
  const base = `https://${mailchimpInstance}.api.mailchimp.com/3.0`;
  const headers = { 'Content-Type': 'application/json;charset=utf-8', 'Authorization': authHeader };

  const createRes = await fetch(`${base}/batches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operations }),
  });
  if (!createRes.ok) {
    throw new Error(`Batch create failed: HTTP ${createRes.status} ${await createRes.text()}`);
  }
  const batch = await createRes.json();
  console.log(`Batch enviado. id=${batch.id}, status=${batch.status}`);

  // Poll hasta que Mailchimp termine de procesar el batch (async por diseño).
  let status = batch;
  while (status.status !== 'finished') {
    await sleep(3000);
    const pollRes = await fetch(`${base}/batches/${batch.id}`, { headers });
    if (!pollRes.ok) throw new Error(`Batch poll failed: HTTP ${pollRes.status}`);
    status = await pollRes.json();
    console.log(`  ...${status.status} (finished=${status.finished_operations}/${status.total_operations}, errored=${status.errored_operations})`);
  }
  return status;
}

async function run() {
  if (!MONGOOSE_URI) {
    console.error('Backfill aborted: MONGOOSE_CONNECTION_STRING is not set.');
    process.exit(1);
  }
  if (EXECUTE && (!mailchimpInstance || !listId || !mailchimpApiKey)) {
    console.error('Backfill aborted: faltan MAIL_CHIMP_INSTANCE / LIST_UNIQUE_ID / MAIL_CHIMP_API_KEY.');
    process.exit(1);
  }

  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGOOSE_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (llama a Mailchimp)' : 'DRY-RUN (no red)'}${LIMIT ? `, limit=${LIMIT}` : ''}\n`);

  // PAIS solo existe en la lista de reseñadores (registerReviewer). Backfill solo
  // a usuarios que son reseñadores y tienen país mapeable.
  const reviewerAuthorIds = await Reviewer.distinct('author');
  let users = await User.find(
    { _id: { $in: reviewerAuthorIds }, country: { $exists: true, $ne: null } },
    { email: 1, country: 1 }
  ).lean();

  if (LIMIT) users = users.slice(0, LIMIT);

  const { operations, skipped } = buildOperations(users, listId);

  console.log('--- Plan de backfill ---');
  console.log(`Reseñadores con country no-nulo considerados: ${users.length}`);
  console.log(`  Operaciones PATCH PAIS a enviar:            ${operations.length}`);
  console.log(`  Saltados (país no mapeable):                ${skipped.length}`);
  operations.slice(0, 20).forEach((op) => {
    console.log(`  ${op.operation_id} → PAIS=${JSON.parse(op.body).merge_fields.PAIS}`);
  });
  if (operations.length > 20) console.log(`  ... (+${operations.length - 20} más)`);
  if (skipped.length) {
    console.log('\nSaltados:');
    skipped.forEach((s) => console.log(`  ${s.email}: ${JSON.stringify(s.country)}`));
  }

  if (!EXECUTE) {
    console.log('\nDRY-RUN: no se ha llamado a Mailchimp. Reejecuta con --execute para enviar.');
    await mongoose.disconnect();
    return;
  }
  if (operations.length === 0) {
    console.log('\nNada que enviar.');
    await mongoose.disconnect();
    return;
  }

  const summary = await submitBatch(operations);

  // Guardar el resumen + la URL de resultados por-operación para reintentar fallos.
  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `mailchimp-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ finishedAt: new Date().toISOString(), summary, operations, skipped }, null, 2));

  console.log(`\n✅ Batch finalizado. total=${summary.total_operations}, ok=${summary.finished_operations}, errores=${summary.errored_operations}`);
  if (summary.errored_operations > 0) {
    console.log(`⚠️  Hubo errores. Descarga el detalle por operación en: ${summary.response_body_url}`);
  }
  console.log(`Log local: ${logPath}`);
  console.log('\nVerifica manualmente en el panel de Mailchimp que PAIS quedó como se espera antes de dar por cerrado.');

  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}

module.exports = { buildOperations };
