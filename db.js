// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Cyaop5zXk4wP@ep-fancy-boat-a18w93oh-pooler.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;
