
import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
app.use(cors());
app.use(express.json());

const REDIS_URL = process.env.REDIS_URL || "redis://default:OWMKWKcX6AaO6suer6Nguk45A2YYrGqS@redis-12937.c14.us-east-1-3.ec2.cloud.redislabs.com:12937";
const redis = new Redis(REDIS_URL);

app.get('/api/health', async (req, res) => {
  try {
    const status = await redis.ping();
    res.json({ status: 'ok', database: 'redis', ping: status });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const existing = await redis.get(`user:by-email:${email}`);
    if (existing) return res.status(409).json({ error: 'Email exists' });

    const id = await redis.incr('global:user_id');
    const user = { id, email, password };
    await redis.set(`user:by-email:${email}`, id);
    await redis.set(`user:${id}`, JSON.stringify(user));
    res.json({ id, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const id = await redis.get(`user:by-email:${email}`);
    if (!id) return res.status(401).json({ error: 'Invalid credentials' });
    const user = JSON.parse(await redis.get(`user:${id}`));
    if (user.password === password) res.json({ id: user.id, email: user.email });
    else res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ids = await redis.smembers(`user:${userId}:objects`);
    if (ids.length === 0) return res.json([]);
    const objects = await redis.mget(ids.map(id => `object:${id}`));
    res.json(objects.map(o => JSON.parse(o)).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, description } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const id = await redis.incr('global:object_id');
    const object = { id, userId: Number(userId), name, description };
    await redis.set(`object:${id}`, JSON.stringify(object));
    await redis.sadd(`user:${userId}:objects`, id);
    res.json(object);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/objects/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name } = req.body;
  try {
    const object = JSON.parse(await redis.get(`object:${req.params.id}`));
    if (object && object.userId == userId) {
      object.name = name;
      await redis.set(`object:${req.params.id}`, JSON.stringify(object));
      res.json({ success: true });
    } else res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/tariffs', async (req, res) => {
  try {
    const data = await redis.get(`tariff:${req.params.id}`);
    res.json(data ? JSON.parse(data) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/tariffs', async (req, res) => {
  try {
    await redis.set(`tariff:${req.params.id}`, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/objects/:id/bills', async (req, res) => {
  try {
    const bills = await redis.lrange(`object:${req.params.id}:bills`, 0, -1);
    res.json(bills.map(b => JSON.parse(b)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objects/:id/bills', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const billData = req.body;
  const objectId = req.params.id;
  try {
    const id = await redis.incr('global:bill_id');
    const bill = { ...billData, id: id.toString(), objectId: Number(objectId), userId: Number(userId) };
    await redis.lpush(`object:${objectId}:bills`, JSON.stringify(bill));
    await redis.set(`bill:${id}`, JSON.stringify(bill));
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bills/:id/name', async (req, res) => {
  const billId = req.params.id;
  const { name } = req.body;
  const userId = req.headers['x-user-id'];
  try {
    const bill = JSON.parse(await redis.get(`bill:${billId}`));
    if (bill && bill.userId == userId) {
      const oldStr = JSON.stringify(bill);
      bill.name = name;
      const newStr = JSON.stringify(bill);
      await redis.set(`bill:${billId}`, newStr);
      await redis.lrem(`object:${bill.objectId}:bills`, 1, oldStr);
      await redis.lpush(`object:${bill.objectId}:bills`, newStr);
      res.json({ success: true });
    } else res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
