const https = require('https');
const fs = require('fs');

const url = 'https://gateway.cloud.pje.jus.br/tpu/api/v1/publico/download/classes';

https.get(url, { headers: { 'User-Agent': 'node-fetch' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      // Escrever raw
      fs.writeFileSync('backend/data/pje_classes_raw.json', data, 'utf8');
      const parsed = JSON.parse(data);
      fs.writeFileSync('backend/data/pje_classes_parsed.json', JSON.stringify(parsed, null, 2), 'utf8');
      console.log('OK', Object.keys(parsed).length || parsed.length);
    } catch (e) {
      console.error('ERR_PARSE', e.message);
    }
  });
}).on('error', err => {
  console.error('ERR', err.message);
});