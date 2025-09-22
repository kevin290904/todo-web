const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const webpush = require('web-push');

const app = express();
const port = process.env.PORT || 3000;

// =================== DATABASE (Neon) ===================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:password123@ep-xxxx.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// =================== MIDDLEWARE ===================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =================== PUSH NOTIFICATION ===================
webpush.setVapidDetails(
  'mailto:boskevin@example.com',
  'BERdF2RCyiuTyNPaVcknf2fU98BLRLM-M1EAZPZDayAKykMzcXfYFx14FIaCld_n63O-FCOJkThjfLG9xBEOfaI',
  'aaS1Re4GPE8cwLhujnxvPVYnb8S1tqSjTSYwWgaiHGE'
);

let subscriptions = [];

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({});
});

app.post('/send-notification', (req, res) => {
  const payload = JSON.stringify({
    title: 'Pengingat Tugas',
    body: 'Jangan lupa kerjakan tugasmu!'
  });
  subscriptions.forEach(sub => {
    webpush.sendNotification(sub, payload).catch(err => console.error(err));
  });
  res.json({ message: 'Notifikasi terkirim' });
});

// =================== TASK ENDPOINTS ===================
// Get tasks
app.get('/tasks', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'user_id harus disertakan' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY deadline ASC NULLS LAST',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /tasks]', err.message);
    res.status(500).json({ error: 'Gagal mengambil data tugas' });
  }
});

// Add task
app.post('/tasks', async (req, res) => {
  const { text, priority, deadline, done = false, notified = false, file = null, filename = null, user_id } = req.body;
  const id = uuidv4();
  try {
    const result = await pool.query(
      `INSERT INTO tasks (id, text, priority, deadline, done, notified, file, filename, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, text, priority, deadline, done, notified, file, filename, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /tasks]', err.message);
    res.status(500).json({ error: 'Gagal menambah tugas' });
  }
});

// Update task
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { text, priority, deadline, done, notified, file, filename } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET text=$1, priority=$2, deadline=$3, done=$4, notified=$5, file=$6, filename=$7
       WHERE id=$8 RETURNING *`,
      [text, priority, deadline, done, notified, file, filename, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /tasks/:id]', err.message);
    res.status(500).json({ error: 'Gagal mengupdate tugas' });
  }
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /tasks/:id]', err.message);
    res.status(500).json({ error: 'Gagal menghapus tugas' });
  }
});

// =================== USER AUTH ===================
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)',
      [id, username, email, password]
    );
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('[POST /register]', err.message);
    res.status(500).json({ message: 'Error saat registrasi' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ userId: result.rows[0].id });
    } else {
      res.status(401).json({ message: 'Username atau password salah' });
    }
  } catch (err) {
    console.error('[POST /login]', err.message);
    res.status(500).json({ message: 'Gagal login' });
  }
});

// =================== SERVER LISTEN ===================
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
