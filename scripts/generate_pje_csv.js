const fs = require('fs');

const inPath = 'backend/data/pje_classes_parsed.json';
const outPath = 'backend/data/pje_classes_table.csv';

const raw = fs.readFileSync(inPath, 'utf8');
const arr = JSON.parse(raw);

const rows = ['codigo,descricao'];
arr.forEach(item => {
  const codigo = item.cod_item !== undefined ? String(item.cod_item) : '';
  // descricao: preferir 'nome', caso tenha HTML remover quebras e aspas
  let descricao = item.nome || '';
  descricao = descricao.replace(/\r?\n/g, ' ');
  descricao = descricao.replace(/"/g, '""'); // escape quotes for CSV
  // wrap in quotes if contains comma or quotes
  if (descricao.includes(',') || descricao.includes('"')) {
    descricao = `"${descricao}"`;
  }
  rows.push(`${codigo},${descricao}`);
});

fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
console.log('CSV_OK', arr.length, 'rows ->', outPath);
