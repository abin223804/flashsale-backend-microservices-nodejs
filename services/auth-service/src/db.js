// import pg from 'pg';
// import dotenv from 'dotenv';
// dotenv.config();

// const { Pool } = pg;

// const pool = new Pool({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 5432,
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASS || 'password',
//   database: process.env.DB_NAME || 'flashsale_auth'
// });

// export default pool;


import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || 'quicksale',
  password: process.env.DB_PASSWORD || 'quicksale',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'quicksale',
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL successfully'))
  .catch(err => console.error('❌ Database connection error:', err.message));

export default pool;
