const { runSeedScript } = require('./db-utils');
const seedCollabMocks = require('./seed-collab-mocks');

async function seed() {
  return seedCollabMocks();
}

module.exports = seed;

if (require.main === module) {
  runSeedScript(seed, 'database');
}
