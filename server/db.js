// PostgreSQL connection pool (DATABASE_URL comes from .env)
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
// const { Pool } = require('pg');

// const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

// module.exports = pool;


const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
});

module.exports = pool;