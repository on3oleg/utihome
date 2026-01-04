import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connection String logic
const connectionString = process.env.DATABASE_URL;

// SSL Configuration for Aiven
// Handle potential newline issues in environment variables
const caCert = process.env.DB_CA_CERT ? process.env.DB_CA_CERT.replace(/\\n/g, '\n') : undefined;

const sslConfig = connectionString && (
  connectionString.includes('sslmode=require') || 
  connectionString.includes('aivencloud.com')
) ? {
  rejectUnauthorized: false, // Fixes self-signed cert chain error
  ca: caCert
} : false;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 5000 
});

// Initialize Database Schema
const initDb = async () => {
  if (!connectionString) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS tariffs (
        object_id INTEGER PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        object_id INTEGER,
        date BIGINT,
        total_cost NUMERIC,
        data JSONB
      );
    `);
    console.log("Database schema initialized.");
  } catch (err) {
    console.error("Schema Init Error:", err.message);
  }
};

if (connectionString) {
  initDb().catch(err => console.error('Early init failed:', err.message));
}

app.get('/api/health', async (req, res) => {
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      has_db_url: !!process.env.DATABASE_URL,
      has_ca_cert: !!process.env.DB_CA_CERT,
      node_env: process.env.NODE_ENV
    },
    database: 'unknown'
  };

  try {
    if (!connectionString) {
      healthInfo.database = 'missing_config';
      return res.status(500).json(healthInfo);
    }
    const dbCheck = await pool.query('SELECT 1');
    healthInfo.database = 'connected';
    res.json(healthInfo);
  } catch (err) {
    healthInfo.database = 'error';
    healthInfo.error = err.message;
    res.status(500).json(healthInfo);
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email exists' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT id, user_id as "userId", name, description FROM objects WHERE user_id = $1 ORDER BY id', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, description } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      'INSERT INTO objects (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, user_id as "userId", name, description',
      [userId, name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/objects/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name } = req.body;
  try {
    await pool.query('UPDATE objects SET name = $1 WHERE id = $2 AND user_id = $3', [name, req.params.id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/tariffs', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM tariffs WHERE object_id = $1', [req.params.id]);
    res.json(result.rows.length > 0 ? result.rows[0].data : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/tariffs', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO tariffs (object_id, data) VALUES ($1, $2) ON CONFLICT (object_id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.body]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/bills', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, data FROM bills WHERE object_id = $1 ORDER BY date DESC', [req.params.id]);
    const bills = result.rows.map(row => ({ ...row.data, id: row.id.toString() }));
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/bills', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const billData = req.body;
  const objectId = req.params.id;
  const fullBillData = { ...billData, objectId: Number(objectId) };
  try {
    const result = await pool.query(
      'INSERT INTO bills (user_id, object_id, date, total_cost, data) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, objectId, billData.date, billData.totalCost, fullBillData]
    );
    res.json({ id: result.rows[0].id.toString(), ...fullBillData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id/name', async (req, res) => {
  const billId = req.params.id;
  const { name } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    const current = await pool.query('SELECT data FROM bills WHERE id = $1 AND user_id = $2', [billId, userId]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const newData = { ...current.rows[0].data, name };
    await pool.query('UPDATE bills SET data = $1 WHERE id = $2', [newData, billId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/objects/:id/bills/update-service-name', async (req, res) => {
  const objectId = req.params.id;
  const { fieldId, newName } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    const result = await pool.query('SELECT id, data FROM bills WHERE object_id = $1 AND user_id = $2', [objectId, userId]);
    let updatedCount = 0;
    for (const row of result.rows) {
        const bill = row.data;
        if (!bill.customRecords) continue;
        let changed = false;
        const newRecords = bill.customRecords.map(rec => {
             if (rec.fieldId === fieldId && rec.name !== newName) {
                 changed = true;
                 return { ...rec, name: newName };
             }
             return rec;
        });
        if (changed) {
            await pool.query('UPDATE bills SET data = $1 WHERE id = $2', [{ ...bill, customRecords: newRecords }, row.id]);
            updatedCount++;
        }
    }
    res.json({ success: true, updated: updatedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

export default app;