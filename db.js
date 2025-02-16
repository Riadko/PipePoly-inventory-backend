require('dotenv').config();
const { Pool } = require('pg');

// Use the connection string from the environment variable
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Render's PostgreSQL
  },
});

module.exports = pool;