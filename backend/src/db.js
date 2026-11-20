const fs = require('fs');
const mysql = require('mysql2/promise');

// On AWS the EC2 boot script writes the Secrets Manager secret to a file and
// sets DB_SECRET_FILE. Locally, plain DB_USER / DB_PASSWORD env vars are used.
function credentials() {
  if (process.env.DB_SECRET_FILE) {
    const secret = JSON.parse(fs.readFileSync(process.env.DB_SECRET_FILE, 'utf8'));
    return { user: secret.username, password: secret.password };
  }
  return { user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'bloodlink',
  ...credentials(),
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // return DATE columns as 'YYYY-MM-DD' strings
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS donors (
     id                 INT AUTO_INCREMENT PRIMARY KEY,
     name               VARCHAR(100) NOT NULL,
     blood_group        VARCHAR(3)   NOT NULL,
     city               VARCHAR(60)  NOT NULL,
     phone              VARCHAR(20)  NOT NULL UNIQUE,
     last_donation_date DATE NULL,
     is_available       BOOLEAN      NOT NULL DEFAULT TRUE,
     created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_city_group (city, blood_group)
   )`,
  `CREATE TABLE IF NOT EXISTS blood_requests (
     id            INT AUTO_INCREMENT PRIMARY KEY,
     patient_name  VARCHAR(100) NOT NULL,
     blood_group   VARCHAR(3)   NOT NULL,
     units         TINYINT      NOT NULL DEFAULT 1,
     hospital      VARCHAR(150) NOT NULL,
     city          VARCHAR(60)  NOT NULL,
     contact_phone VARCHAR(20)  NOT NULL,
     needed_by     DATE         NOT NULL,
     created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_city_needed (city, needed_by)
   )`,
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// RDS may still be starting when the instance boots, so retry before giving up.
async function initDatabase(retries = 20) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      for (const statement of SCHEMA) await pool.query(statement);
      console.log('Database ready');
      return;
    } catch (err) {
      console.error(`DB not ready (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(5000);
    }
  }
}

module.exports = { pool, initDatabase };
