import express from 'express';
import session from 'express-session';
import pg from 'pg';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const app = express();
const db = new pg.Pool();
const hash = promisify(scrypt);
const hashOptions = { N: 32768, maxmem: 67108864 };
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
// shortcut: local demo sessions are in memory; use a persistent store before deployment.
app.use(session({
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: 3600000 }
}));
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
      typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Enter a name, valid email, and password of 8-128 characters.' });
  }
  const salt = randomBytes(16).toString('hex');
  const key = await hash(password, salt, 64, hashOptions);
  await db.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)',
    [name.trim(), email.trim().toLowerCase(), salt + ':' + key.toString('hex')]);
  res.status(201).json({ message: 'Account created. Log in.' });
});
app.post('/api/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || email.length > 254 ||
      typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }
  const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email.trim().toLowerCase()]);
  const user = rows[0];
  const [salt, stored] = user ? user.password_hash.split(':') : ['missing-user', '00'.repeat(64)];
  const key = await hash(password, salt, 64, hashOptions);
  if (!user || !timingSafeEqual(key, Buffer.from(stored, 'hex'))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  req.session.regenerate(error => {
    if (error) return next(error);
    req.session.user = { id: user.id, name: user.name };
    res.json(req.session.user);
  });
});
app.get('/api/me', (req, res) => res.json(req.session.user || null));
app.post('/api/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});
app.use('/api', (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Log in first.' });
  next();
});
app.get('/api/accounts', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id,number,type,balance FROM accounts WHERE user_id=$1 ORDER BY id', [req.session.user.id]);
  res.json(rows);
});
app.get('/api/accounts/:id/transactions', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(400).json({ error: 'Invalid account.' });
  }
  const account = await db.query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2', [id, req.session.user.id]);
  if (!account.rowCount) return res.status(404).json({ error: 'Account not found.' });
  const { rows } = await db.query(
    'SELECT id,date::text,description,type,amount FROM transactions WHERE account_id=$1 ORDER BY date DESC,id DESC', [id]);
  res.json(rows);
});
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(express.static('client/dist'));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === '23505') return res.status(409).json({ error: 'Email already registered.' });
  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? 'Server request failed.' : 'Invalid request body.' });
});
db.on('error', () => console.error('Database connection failed.'));
await db.query('SELECT 1');
app.listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('Bank API ready.'));