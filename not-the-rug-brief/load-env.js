const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) return;

  const root = process.cwd();
  dotenv.config({ path: path.join(root, '.env.local'), override: false });
  dotenv.config({ path: path.join(root, '.env'), override: false });
  loaded = true;
}

loadEnv();

module.exports = { loadEnv };
