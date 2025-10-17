try {
  require('../backend/routes/mni3');
  require('../backend/services/pjeTabelaClient');
  console.log('REQUIRE_OK');
} catch (e) {
  console.error('REQUIRE_ERR', e && e.stack ? e.stack : e);
  process.exit(1);
}