// Test to reproduce and verify the parseAssuntos bug fix

const testData = {
  assuntos: [
    {
      attributes: { principal: "false" },
      codigoNacional: "5915"
    },
    {
      attributes: { principal: "true" },
      codigoNacional: "5946"
    },
    {
      attributes: { principal: "true" },
      codigoNacional: "5947"
    }
  ]
};

console.log('========================================');
console.log('TEST: parseAssuntos Logic');
console.log('========================================\n');
console.log('Input data:', JSON.stringify(testData, null, 2));
console.log('\n========================================');
console.log('Testing NEW extraction logic (explicit if-else)...\n');

testData.assuntos.forEach((assunto, index) => {
  const attrs = assunto.attributes || assunto.$ || assunto.$attributes || {};
  
  // NEW LOGIC: Explicit if-else chain
  let codigo = '';
  if (assunto.codigoNacional) {
    codigo = assunto.codigoNacional;
  } else if (assunto.codigo) {
    codigo = assunto.codigo;
  } else if (attrs.codigoNacional) {
    codigo = attrs.codigoNacional;
  } else if (attrs.codigo) {
    codigo = attrs.codigo;
  }
  
  const principalStr = String(attrs.principal || assunto.principal || 'false').toLowerCase();
  const principal = principalStr === 's' || principalStr === 'true';
  
  console.log(`Item ${index}:`);
  console.log('  codigoNacional found:', assunto.codigoNacional);
  console.log('  => codigo extracted:', codigo);
  console.log('  => principal:', principal);
  console.log('  => Final:', { codigo: String(codigo), codigoNacional: String(codigo), principal });
  console.log('');
});

console.log('========================================');
console.log('✅ If all items show correct codigo, the fix works!');
console.log('========================================');
