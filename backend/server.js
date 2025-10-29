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
// FIXED MongoDB connection

let db;
let client;

async function connectDB() {
  try {
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    db = client.db('urlshortener');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

// Connect immediately
connectDB();


// Enable CORS for your frontend
app.use(cors({
    origin: [
        'https://smart-link-shortner.netlify.app',
        'https://linkshortner.site',
        'https://linkshortner-6ils.onrender.com', // ← ADD THIS
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(bodyParser.json());
//app.use(express.static(PUBLIC_DIR));

// REMOVE ALL FILE OPERATIONS - Delete these lines:
// if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, '[]', 'utf8');
// function loadContacts() { ... }
// function saveContacts(arr) { ... }
// function loadUrls() { ... } 
// function saveUrls(arr) { ... }

/* NEW MongoDB Helper Functions */
async function loadUrls() {
  try {
    console.log('🔍 DEBUG: loadUrls() called');
    
    // If db is not connected yet, try to connect
    if (!db) {
      console.log('⚠️ DEBUG: Database not connected, attempting to connect...');
      await connectDB();
    }
    
    if (!db) {
      console.log('❌ DEBUG: Database still not available');
      return [];
    }
    
    console.log('🔍 DEBUG: Querying MongoDB for URLs...');
    const urls = await db.collection('urls').find().toArray();
    console.log('✅ DEBUG: loadUrls() found', urls.length, 'URLs');
    
    return urls;
  } catch (e) {
    console.error('❌ DEBUG: Failed to load URLs from MongoDB', e);
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
/*app.get('/', (req, res) => {
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
});*/

// ⬇️⬇️⬇️ NOW KEEP YOUR EXISTING :code ROUTE ⬇️⬇️⬇️
/* Redirect route - MINIMAL CHANGES */
/* Redirect route - DEBUG VERSION */
app.get('/:code', async (req, res) => {
  const code = req.params.code;
  console.log('🔄 DEBUG: Redirect attempt for code:', code);
  
  try {
    console.log('🔍 DEBUG: Loading URLs from MongoDB...');
    const urls = await loadUrls();
    console.log('📊 DEBUG: Loaded', urls.length, 'URLs from MongoDB');
    
    console.log('🔍 DEBUG: Searching for code:', code);
    const item = urls.find(u => u.code === code);
    console.log('🎯 DEBUG: Found item:', item);
    
    if (!item) {
      console.log('❌ DEBUG: Short link not found:', code);
      console.log('📋 DEBUG: Available codes:', urls.map(u => u.code));
      return res.status(404).json({ 
        error: 'Short link not found',
        debug: {
          requestedCode: code,
          availableCodes: urls.map(u => u.code),
          totalUrls: urls.length
        }
      });
    }

    console.log('✅ DEBUG: Redirecting:', code, '→', item.original);
    
    // ADD Click tracking - Update click count in MongoDB
    try {
      await db.collection('urls').updateOne(
        { code: code },
        { $inc: { clicks: 1 } }
      );
      console.log('📊 DEBUG: Click tracked for:', code);
    } catch (error) {
      console.error('❌ DEBUG: Failed to update click count:', error);
    }

    console.log('🎉 DEBUG: SUCCESS - Redirecting to:', item.original);
    return res.redirect(301, item.original);
    
  } catch (error) {
    console.error('❌ DEBUG: Redirect error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      debug: error.message 
    });
  }
});



/* KEEP EVERYTHING ELSE EXACTLY THE SAME */
/*app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});*/

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

// DEBUG ROUTE - Check MongoDB data
app.get('/api/debug/urls', async (req, res) => {
  try {
    const urls = await loadUrls();
    res.json({
      totalUrls: urls.length,
      urls: urls.map(u => ({ code: u.code, original: u.original, createdAt: u.createdAt }))
    });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});

// DEBUG ROUTE - Check if specific code exists
app.get('/api/debug/urls/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const urls = await loadUrls();
    const item = urls.find(u => u.code === code);
    
    res.json({
      code: code,
      exists: !!item,
      item: item
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://127.0.0.1:${PORT}`));
