// backend/server.js (UPDATED WITH MONGODB)
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb'); // ADD THIS
require('dotenv').config(); // ADD THIS
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// REMOVE: const DATA_FILE = path.join(__dirname, 'urls.json');
// REMOVE: const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ADD MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true
});
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('urlshortener');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

connectDB();

// Enable CORS for your frontend
app.use(cors({
    origin: [
        'https://smart-link-shortner.netlify.app',
        'https://linkshortner.site',
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(bodyParser.json());
app.use(express.static(PUBLIC_DIR));

// REMOVE ALL FILE OPERATIONS - Delete these lines:
// if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]', 'utf8');
// function loadContacts() { ... }
// function saveContacts(arr) { ... }
// function loadUrls() { ... } 
// function saveUrls(arr) { ... }

/* NEW MongoDB Helper Functions */
async function loadUrls() {
  try {
    const urls = await db.collection('urls').find().toArray();
    return urls;
  } catch (e) {
    console.error('Failed to load URLs from MongoDB', e);
    return [];
  }
}

async function loadContacts() {
  try {
    const contacts = await db.collection('contacts').find().toArray();
    return contacts;
  } catch (e) {
    console.error('Failed to load contacts from MongoDB', e);
    return [];
  }
}

// KEEP YOUR EXISTING FUNCTIONS (unchanged):
function generateCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len);
}

function isValidAlias(a) {
  return /^[A-Za-z0-9_-]{3,64}$/.test(a);
}

/* API: create short link - MINIMAL CHANGES */
app.post('/api/shorten', async (req, res) => { // ADD async
  const { original, alias, note } = req.body;
  if (!original) return res.status(400).json({ error: 'Missing original URL' });

  const urls = await loadUrls(); // ADD await

  // If alias provided - validate and ensure uniqueness
  let code = '';
  if (alias && alias.trim() !== '') {
    if (!isValidAlias(alias.trim())) {
      return res.status(400).json({ error: 'Alias invalid. Use 3-64 chars: letters, numbers, - or _' });
    }
    if (urls.find(u => u.code === alias.trim())) {
      return res.status(409).json({ error: 'Alias already taken' });
    }
    code = alias.trim();
  } else {
    // generate unique code
    do { code = generateCode(6); } while (urls.find(u => u.code === code));
  }

  const item = {
    code,
    original,
    note: note || '',
    createdAt: new Date().toISOString(),
    clicks: 0 // ADD click tracking
  };

  // REPLACE FILE SAVE WITH MONGODB INSERT
  try {
    await db.collection('urls').insertOne(item);
  } catch (error) {
    console.error('Failed to save URL to MongoDB:', error);
    return res.status(500).json({ error: 'Failed to save URL' });
  }
 
 const shortUrl = `https://linkshortner.site/${code}`;
  res.json({ ok: true, code, shortUrl });
});


/* Contact form - MINIMAL CHANGES */
app.post('/api/contact', async (req, res) => { // ADD async
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required' });

  console.log('[POST] /api/contact - received', { name, email, subject });

  try {
    const item = { 
      name, 
      email, 
      subject: subject || '', 
      message, 
      createdAt: new Date().toISOString() 
    };

    // REPLACE FILE SAVE WITH MONGODB INSERT
    await db.collection('contacts').insertOne(item);

    return res.json({ ok: true, saved: item });
  } catch (err) {
    console.error('Error handling contact POST', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// ⬇️⬇️⬇️ ADD THESE STATIC ROUTES ⬇️⬇️⬇️

// Serve main pages FIRST
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'contact.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'terms.html'));
});

app.get('/blogs', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'blogs.html'));
});

// ⬇️⬇️⬇️ NOW KEEP YOUR EXISTING :code ROUTE ⬇️⬇️⬇️
/* Redirect route - MINIMAL CHANGES */
app.get('/:code', async (req, res) => { // ADD async
  const code = req.params.code;
  const urls = await loadUrls(); // ADD await
  const item = urls.find(u => u.code === code);
  if (!item) {
    return res.status(404).sendFile(path.join(PUBLIC_DIR, 'notfound.html'));
  }

  // ADD Click tracking - Update click count in MongoDB
  try {
    await db.collection('urls').updateOne(
      { code: code },
      { $inc: { clicks: 1 } }
    );
  } catch (error) {
    console.error('Failed to update click count:', error);
  }

  return res.redirect(301, item.original);
});




/* KEEP EVERYTHING ELSE EXACTLY THE SAME */
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

/* Waitlist API */
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const item = { 
      email, 
      createdAt: new Date().toISOString(),
      source: 'website_waitlist'
    };

    await db.collection('waitlist').insertOne(item);
    return res.json({ ok: true, message: 'Added to waitlist' });
  } catch (err) {
    console.error('Error saving to waitlist', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// REMOVE: if (!fs.existsSync(DATA_FILE)) saveUrls([]);

app.listen(PORT, () => console.log(`✅ Server running at http://127.0.0.1:${PORT}`));