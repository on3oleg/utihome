
import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Redis connection setup
const REDIS_URL = process.env.REDIS_URL || "redis://default:OWMKWKcX6AaO6suer6Nguk45A2YYrGqS@redis-12937.c14.us-east-1-3.ec2.cloud.redislabs.com:12937";
const redis = new Redis(REDIS_URL);

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Successfully connected to Redis'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const status = await redis.ping();
    res.json({ status: 'ok', database: 'redis_connected', ping: status });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Authentication
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const existing = await redis.get(`user:by-email:${email}`);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

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
    if (!id) return res.status(401).json({ error: 'Invalid email or password' });

    const userStr = await redis.get(`user:${id}`);
    const user = JSON.parse(userStr);

    if (user.password === password) {
      res.json({ id: user.id, email: user.email });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Objects (Properties)
app.get('/api/objects', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const objectIds = await redis.smembers(`user:${userId}:objects`);
    if (objectIds.length === 0) return res.json([]);

    const objectKeys = objectIds.map(id => `object:${id}`);
    const objects = await redis.mget(objectKeys);
    
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
  const objectId = req.params.id;
  
  try {
    const objectStr = await redis.get(`object:${objectId}`);
    if (!objectStr) return res.status(404).json({ error: 'Object not found' });
    
    const object = JSON.parse(objectStr);
    if (object.userId != userId) return res.status(403).json({ error: 'Forbidden' });
    
    object.name = name;
    await redis.set(`object:${objectId}`, JSON.stringify(object));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tariffs
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

// Bills
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
    const billId = await redis.incr('global:bill_id');
    const bill = { ...billData, id: billId.toString(), objectId: Number(objectId), userId: Number(userId) };
    
    // We store the full JSON in the list for history
    await redis.lpush(`object:${objectId}:bills`, JSON.stringify(bill));
    // We also store individual key for direct updates if needed
    await redis.set(`bill:${billId}`, JSON.stringify(bill));
    
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
    const billStr = await redis.get(`bill:${billId}`);
    if (!billStr) return res.status(404).json({ error: 'Bill not found' });
    
    const bill = JSON.parse(billStr);
    if (bill.userId != userId) return res.status(403).json({ error: 'Forbidden' });
    
    const oldBillStr = JSON.stringify(bill);
    bill.name = name;
    const newBillStr = JSON.stringify(bill);
    
    // Update individual key
    await redis.set(`bill:${billId}`, newBillStr);
    
    // Update the record in the object list (inefficient in Redis LIST, but feasible for small histories)
    await redis.lrem(`object:${bill.objectId}:bills`, 1, oldBillStr);
    await redis.lpush(`object:${bill.objectId}:bills`, newBillStr);
    
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

app.listen(PORT, () => console.log(`UtiHome Redis Backend running on port ${PORT}`));
