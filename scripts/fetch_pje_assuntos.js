const https = require('https');
const fs = require('fs');

const url = 'https://gateway.cloud.pje.jus.br/tpu/api/v1/publico/download/assuntos';

https.get(url, { headers: { 'User-Agent': 'node-fetch' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      fs.writeFileSync('backend/data/pje_assuntos_raw.json', data, 'utf8');
      const parsed = JSON.parse(data);
      fs.writeFileSync('backend/data/pje_assuntos_parsed.json', JSON.stringify(parsed, null, 2), 'utf8');
      console.log('OK', Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length);
    } catch (e) {
      console.error('ERR_PARSE', e.message);
    }
  });
}).on('error', err => {
  console.error('ERR', err.message);
});