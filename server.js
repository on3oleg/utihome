import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MySQL connection pool with SSL for remote hosts
const pool = mysql.createPool({
  host: '35.246.136.35',
  user: 'testuser',
  password: 'E4gEzR&A0FDPN8,3',
  database: 'utihome',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'mysql_connected' });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, password]);
    console.log(`User registered: ${email}`);
    res.json({ id: Number(result.insertId), email });
  } catch (err) {
    console.error("Registration DB error:", err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: `Database error: ${err.message}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT id, email FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    console.error("Login DB error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [rows] = await pool.query('SELECT id, user_id as userId, name, description FROM objects WHERE user_id = ? ORDER BY id', [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, description } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const [result] = await pool.query('INSERT INTO objects (user_id, name, description) VALUES (?, ?, ?)', [userId, name, description]);
    res.json({ id: Number(result.insertId), userId: Number(userId), name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/objects/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name } = req.body;
  try {
    await pool.query('UPDATE objects SET name = ? WHERE id = ? AND user_id = ?', [name, req.params.id, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/tariffs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT data FROM tariffs WHERE object_id = ?', [req.params.id]);
    res.json(rows.length > 0 ? rows[0].data : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/tariffs', async (req, res) => {
  try {
    const dataStr = JSON.stringify(req.body);
    await pool.query(
      'INSERT INTO tariffs (object_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
      [req.params.id, dataStr, dataStr]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/bills', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, data FROM bills WHERE object_id = ? ORDER BY date DESC', [req.params.id]);
    res.json(rows.map(r => ({ ...r.data, id: r.id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/bills', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const billData = req.body;
  const objectId = req.params.id;
  try {
    const dataStr = JSON.stringify({ ...billData, objectId: Number(objectId) });
    const [result] = await pool.query(
      'INSERT INTO bills (user_id, object_id, date, total_cost, data) VALUES (?, ?, ?, ?, ?)',
      [userId, objectId, billData.date, billData.totalCost, dataStr]
    );
    res.json({ id: result.insertId.toString(), ...billData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id/name', async (req, res) => {
  const billId = req.params.id;
  const { name } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    const [rows] = await pool.query('SELECT data FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    const newData = { ...rows[0].data, name };
    await pool.query('UPDATE bills SET data = ? WHERE id = ?', [JSON.stringify(newData), billId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => console.log(`Online-First MySQL server running on port ${PORT}`));