
'use strict';

// Corrige el merge field PAIS en Mailchimp: traduce nombres legacy en inglés a
// su nombre en español. Por defecto SOLO actúa sobre "Spain" → "España" (que es
// lo único que interesa arreglar en bloque); con --all-countries traduce
// cualquier valor legacy mapeable.
//
// Es MAILCHIMP-ONLY: no abre la BBDD (a diferencia de backfillMailchimpCountry.js,
// que asume DB y Mailchimp sincronizados — no es el caso). Reutiliza el mismo
// mapeo (utils/constants) para que el nombre español coincida con la sync normal.
//
// SEGURIDAD: solo escribe con --execute. Cada PATCH lleva EXACTAMENTE
// { merge_fields: { PAIS: <nombre ES> } } — nunca status/FNAME/GENERO/FORMATO.
//
// Uso:
//   node scripts/fixMailchimpPais.js                            # dry-run: qué cambiaría (todos los "Spain")
//   node scripts/fixMailchimpPais.js --only a@x.com             # dry-run de un contacto
//   node scripts/fixMailchimpPais.js --execute --only a@x.com   # prueba real de 1 contacto
//   node scripts/fixMailchimpPais.js --execute                  # aplica a todos los "Spain"
//   node scripts/fixMailchimpPais.js --execute --all-countries  # traduce todos los legacy mapeables

require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const { toIsoCode } = require('../utils/constants/legacyCountryMap');
const { isoToSpanishName } = require('../utils/constants/countries');

const instance = process.env.MAIL_CHIMP_INSTANCE;
const listId = process.env.LIST_UNIQUE_ID;
const apiKey = process.env.MAIL_CHIMP_API_KEY;
const authHeader = 'Basic ' + Buffer.from('anystring:' + apiKey).toString('base64');
const headers = { 'Content-Type': 'application/json;charset=utf-8', 'Authorization': authHeader };
const base = `https://${instance}.api.mailchimp.com/3.0`;

const EXECUTE = process.argv.includes('--execute');
const ALL_COUNTRIES = process.argv.includes('--all-countries');
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg !== -1 && process.argv[onlyArg + 1]
  ? process.argv[onlyArg + 1].split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  : null;

// Nuevo valor de PAIS en español para un valor actual, o null si no cambia.
// Por defecto solo "Spain"; con --all-countries, cualquier legacy mapeable.
// PURO → testeable.
function targetPais(current, allCountries = ALL_COUNTRIES) {
  if (typeof current !== 'string' || current.trim() === '') return null;
  if (!allCountries && current.trim().toLowerCase() !== 'spain') return null;
  const spanish = isoToSpanishName(toIsoCode(current));
  if (!spanish || spanish === current) return null;
  return spanish;
}

const subscriberHash = (email) => crypto.createHash('md5').update(String(email).toLowerCase()).digest('hex');

// Trae solo los miembros indicados (por hash de email); reporta los no encontrados.
async function fetchMembersByEmail(emails) {
  const members = [];
  for (const email of emails) {
    const res = await fetch(`${base}/lists/${listId}/members/${subscriberHash(email)}`, { headers });
    if (res.ok) {
      members.push(await res.json());
    } else if (res.status === 404) {
      console.log(`⚠️  No está en la lista de Mailchimp: ${email}`);
    } else {
      throw new Error(`GET member ${email} failed: HTTP ${res.status} ${await res.text()}`);
    }
  }
  return members;
}

// Trae todos los miembros de la lista, paginando. Solo pide los campos necesarios.
async function fetchAllMembers() {
  const members = [];
  const count = 1000;
  let offset = 0;
  const fields = 'members.id,members.email_address,members.merge_fields.PAIS';
  for (;;) {
    const res = await fetch(`${base}/lists/${listId}/members?count=${count}&offset=${offset}&fields=${encodeURIComponent(fields)}`, { headers });
    if (!res.ok) throw new Error(`List members failed: HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();
    const batch = data.members || [];
    members.push(...batch);
    if (batch.length < count) break;
    offset += count;
  }
  return members;
}

async function run() {
  if (!instance || !listId || !apiKey) {
    console.error('Faltan MAIL_CHIMP_INSTANCE / LIST_UNIQUE_ID / MAIL_CHIMP_API_KEY.');
    process.exit(1);
  }
  console.log(`Lista: ${listId} | Mode: ${EXECUTE ? 'EXECUTE (escribe en Mailchimp)' : 'DRY-RUN (solo lectura)'}` +
    `${ONLY ? ` | only=${ONLY.join(',')}` : ''} | alcance=${ALL_COUNTRIES ? 'todos los legacy' : 'solo Spain→España'}\n`);

  const members = ONLY ? await fetchMembersByEmail(ONLY) : await fetchAllMembers();

  const changes = [];
  members.forEach((m) => {
    const current = m.merge_fields && m.merge_fields.PAIS;
    const next = targetPais(current);
    if (next) changes.push({ id: m.id, email: m.email_address, from: current, to: next });
  });

  console.log(`Miembros revisados: ${members.length}`);
  console.log(`A cambiar:          ${changes.length}\n`);
  changes.slice(0, 50).forEach((c) => console.log(`  ${c.email}: "${c.from}" → "${c.to}"`));
  if (changes.length > 50) console.log(`  ... (+${changes.length - 50} más)`);

  if (!EXECUTE) {
    console.log('\nDRY-RUN: no se ha escrito nada. Añade --execute para aplicar.');
    return;
  }
  if (changes.length === 0) {
    console.log('\nNada que cambiar.');
    return;
  }

  let ok = 0;
  const failed = [];
  for (const c of changes) {
    const res = await fetch(`${base}/lists/${listId}/members/${c.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ merge_fields: { PAIS: c.to } }),
    });
    if (res.ok) ok++;
    else failed.push({ email: c.email, status: res.status, body: await res.text() });
  }

  console.log(`\n✅ Actualizados: ${ok}/${changes.length}`);
  if (failed.length) {
    console.log(`❌ Fallos: ${failed.length}`);
    failed.forEach((f) => console.log(`  ${f.email}: HTTP ${f.status}`));
  }
  console.log('\nVerifica el resultado en el panel de Mailchimp.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Fix failed:', err);
    process.exit(1);
  });
}

module.exports = { targetPais };
