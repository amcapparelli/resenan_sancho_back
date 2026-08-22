'use strict';
// Renders a sample Instagram image into tmp/ without touching the database or
// any external service. Useful to review the layout by eye:
//   node scripts/instagramPreview.js
const { renderBookImage } = require('../lib/instagram/image');
const { buildCaption } = require('../lib/instagram/caption');
const { savePreview } = require('../lib/instagram/preview');

const sample = {
  id: 'preview',
  title: process.argv[2] || 'El extraño caso del doctor Jekyll y el señor Hyde',
  author: 'Robert Louis Stevenson',
  genre: 'SUS',
  cover: process.argv[3] || 'https://picsum.photos/seed/jekyll/600/800',
  formats: ['papel', 'epub', 'pdf', 'audiolibro'],
  synopsis: 'El abogado Utterson investiga la extraña relación entre su viejo amigo, el respetable doctor Jekyll, y el siniestro señor Hyde, un hombre que despierta el rechazo instintivo de cuantos lo tratan y del que nadie conoce el origen.',
};

(async () => {
  const buffer = await renderBookImage(sample);
  const filePath = await savePreview(buffer, sample.id);
  console.log('\n--- caption ---\n');
  console.log(buildCaption(sample));
  console.log('\n--- image ---\n');
  console.log(filePath);
})();
