// backend/server.js
// Your original server extended with click logging + analytics
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');

// ---- NEW: fetch for geo-IP lookup (install: npm install node-fetch) ----
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

let db;
let client;

async function connectDB() {
  try {
    console.log('🧵 connectDB() called');
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    const dbName = process.env.DB_NAME || 'urlshortener';
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB:', dbName);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    db = null;
  }
}
connectDB().catch(e => console.error('Initial DB connect failed', e));

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
app.use(express.static(PUBLIC_DIR));

async function ensureDb() {
  if (!db) {
    console.log('⚠️ DB not ready, attempting reconnect...');
    await connectDB();
  }
  return !!db;
}

/* ---------- Keep your existing helpers ---------- */
function generateCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len);
}
function isValidAlias(a) {
  return /^[A-Za-z0-9_-]{3,64}$/.test(a);
}

/* ---------- Mongo helpers (urls/contacts) ---------- */
async function loadUrls() {
  try {
    if (!await ensureDb()) return [];
    const urls = await db.collection('urls').find().toArray();
    console.log('📂 loadUrls() loaded', urls.length, 'urls');
    return urls;
  } catch (e) {
    console.error('Failed to load URLs from MongoDB', e);
    return [];
  }
}
async function loadContacts() {
  try {
    if (!await ensureDb()) return [];
    const contacts = await db.collection('contacts').find().toArray();
    console.log('📂 loadContacts() loaded', contacts.length, 'contacts');
    return contacts;
  } catch (e) {
    console.error('Failed to load contacts from MongoDB', e);
    return [];
  }
}

/* ---------- Shorten API (unchanged logic, uses DB) ---------- */
app.post('/api/shorten', async (req, res) => {
  const { original, alias, note } = req.body;
  console.log('✂️ /api/shorten called with:', { original, alias, note });

  if (!original) return res.status(400).json({ error: 'Missing original URL' });

  const urls = await loadUrls();

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
    do { code = generateCode(6); } while (urls.find(u => u.code === code));
  }

  const item = {
    code,
    original,
    note: note || '',
    createdAt: new Date().toISOString(),
    clicks: 0
  };

  try {
    if (!await ensureDb()) throw new Error('DB not available');
    await db.collection('urls').insertOne(item);
    console.log('✂️ Short URL saved:', item);
  } catch (error) {
    console.error('Failed to save URL to MongoDB:', error);
    return res.status(500).json({ error: 'Failed to save URL' });
  }

  const shortUrl = `https://linkshortner.site/${code}`;
  res.json({ ok: true, code, shortUrl });
});

/* ---------- Contact API ---------- */
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  console.log('📩 /api/contact called with:', { name, email, subject });

  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required' });

  try {
    const item = { name, email, subject: subject || '', message, createdAt: new Date().toISOString() };
    if (!await ensureDb()) throw new Error('DB not available');
    await db.collection('contacts').insertOne(item);
    console.log('📩 Contact saved:', item);
    return res.json({ ok: true, saved: item });
  } catch (err) {
    console.error('Error handling contact POST', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ---------- Utility: Get client IP ---------- */
function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    const parts = xfwd.split(',').map(s => s.trim());
    return parts[0];
  }
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  if (req.ip) return req.ip;
  return null;
}

/* ---------- Utility: lightweight UA parser (basic heuristics) ---------- */
function parseUserAgent(ua) {
  const out = {
    browser: 'Unknown',
    browserVersion: '',
    engine: '',
    os: 'Unknown',
    osVersion: '',
    platform: '',
    deviceType: 'desktop',
    deviceBrand: 'unknown',
    deviceModel: 'unknown',
    isBot: false
  };
  if (!ua || typeof ua !== 'string') return out;

  // bot detection
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|applebot|yandex|baiduspider/i.test(ua)) {
    out.isBot = true;
  }

  // browser
  if (/chrome\/([0-9\.]+)/i.test(ua) && !/edg|edge|opr|opera/i.test(ua)) {
    out.browser = 'Chrome';
    out.browserVersion = (ua.match(/chrome\/([0-9\.]+)/i)||[])[1] || '';
    out.engine = 'Blink';
  } else if (/firefox\/([0-9\.]+)/i.test(ua)) {
    out.browser = 'Firefox';
    out.browserVersion = (ua.match(/firefox\/([0-9\.]+)/i)||[])[1] || '';
    out.engine = 'Gecko';
  } else if (/edg\/([0-9\.]+)/i.test(ua) || /edge\/([0-9\.]+)/i.test(ua)) {
    out.browser = 'Edge';
    out.browserVersion = (ua.match(/edg\/([0-9\.]+)/i)||ua.match(/edge\/([0-9\.]+)/i)||[])[1] || '';
    out.engine = 'Blink';
  } else if (/safari\/([0-9\.]+)/i.test(ua) && /version\/([0-9\.]+)/i.test(ua)) {
    out.browser = 'Safari';
    out.browserVersion = (ua.match(/version\/([0-9\.]+)/i)||[])[1] || '';
    out.engine = 'WebKit';
  } else if (/opr\/([0-9\.]+)/i.test(ua) || /opera/i.test(ua)) {
    out.browser = 'Opera';
    out.browserVersion = (ua.match(/opr\/([0-9\.]+)/i)||[])[1] || '';
    out.engine = 'Blink';
  }

  // os
  if (/windows nt 10/i.test(ua)) { out.os = 'Windows'; out.osVersion = '10'; out.platform = 'Windows'; }
  else if (/windows nt 6\.3/i.test(ua)) { out.os = 'Windows'; out.osVersion = '8.1'; out.platform = 'Windows'; }
  else if (/windows nt 6\.1/i.test(ua)) { out.os = 'Windows'; out.osVersion = '7'; out.platform = 'Windows'; }
  else if (/mac os x 10_?15|macintosh/i.test(ua)) { out.os = 'macOS'; out.platform = 'Mac'; }
  else if (/android/i.test(ua)) { out.os = 'Android'; out.platform = 'Android'; out.deviceType = 'mobile'; }
  else if (/iphone|ipad|ipod/i.test(ua)) { out.os = 'iOS'; out.platform = 'IPhone/iPad'; out.deviceType = /ipad/i.test(ua) ? 'tablet' : 'mobile'; }

  // device type fallback
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) out.deviceType = 'mobile';
  if (/tablet|ipad/i.test(ua)) out.deviceType = 'tablet';

  return out;
}

/* ---------- NEW: Geo-IP lookup helper (ipwho.is) ---------- */
async function lookupGeo(ip) {
  try {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      // local/dev IPs – skip external lookup
      console.log('🌐 lookupGeo skipped for local IP:', ip);
      return null;
    }

    console.log('🌐 lookupGeo calling ipwho.is for IP:', ip);
    const resp = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!resp.ok) {
      console.warn('Geo lookup HTTP error for IP', ip, resp.status);
      return null;
    }

    const data = await resp.json();
    if (!data || !data.success) {
      console.warn('Geo lookup failed for IP', ip, data && data.message);
      return null;
    }

    const result = {
      country: data.country || 'unknown',
      city: data.city || 'unknown',
      region: data.region || data.continent || 'unknown',
      timezone: (data.timezone && data.timezone.id) || 'unknown',
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      isp: data.connection && data.connection.isp ? data.connection.isp : null
    };

    console.log('🌐 lookupGeo result for IP', ip, ':', result);
    return result;
  } catch (err) {
    console.error('Geo lookup exception for IP', ip, err);
    return null;
  }
}

/* ---------- Redirect route: logs click into 'clicks' collection then redirects ---------- */
app.get('/:code', async (req, res) => {
  const code = req.params.code;
  console.log('🔄 Redirect attempt for code:', code);

  try {
    const urls = await loadUrls();
    const item = urls.find(u => u.code === code);

    if (!item) {
      console.warn('❓ Short code not found in urls collection:', code);
      return res.status(404).json({
        error: 'Short link not found',
        debug: { requestedCode: code, totalUrls: urls.length }
      });
    }

    // gather analytics info
    const ua = req.headers['user-agent'] || '';
    const parsed = parseUserAgent(ua);
    const ip = getClientIp(req) || req.ip || 'unknown';
    const referrer = req.get('referer') || '';

    console.log('🧭 Parsed UA:', parsed);
    console.log('💻 Raw UA header:', ua);
    console.log('📡 Client IP:', ip);
    console.log('↩️ Referrer:', referrer || '(none)');

    // FIXED: add parentheses so || and ? : work as intended
    const source = req.query.source || (parsed.deviceType === 'mobile' ? 'mobile' : 'direct'); // fallback

    const now = new Date();
    const timestampMs = now.getTime();

    // ---- NEW: geo lookup ----
    const geo = await lookupGeo(ip);

    // Prepare click doc with fields (now using real geo when available)
    const clickDoc = {
      shortCode: code,
      timestamp: now,             // Date object
      timestampMs: timestampMs,   // numeric ms (helpful)
      country: (geo && geo.country) || 'unknown',
      city: (geo && geo.city) || 'unknown',
      region: (geo && geo.region) || 'unknown',
      timezone: (geo && geo.timezone) || 'unknown',
      latitude: geo && typeof geo.latitude === 'number' ? geo.latitude : null,
      longitude: geo && typeof geo.longitude === 'number' ? geo.longitude : null,
      isp: (geo && geo.isp) || null,
      deviceType: parsed.deviceType || 'desktop',
      deviceBrand: parsed.deviceBrand || 'unknown',
      deviceModel: parsed.deviceModel || 'unknown',
      browser: parsed.browser || 'Unknown',
      browserVersion: parsed.browserVersion || '',
      engine: parsed.engine || '',
      os: parsed.os || 'Unknown',
      osVersion: parsed.osVersion || '',
      platform: parsed.platform || '',
      source: source || 'direct',
      referrer: referrer || '',
      isBot: !!parsed.isBot,
      userAgent: ua,
      ip: ip
    };

    console.log('📝 Click document to insert:', clickDoc);

    // Insert click doc to 'clicks' collection (non-blocking best-effort but awaited)
    try {
      if (!await ensureDb()) throw new Error('DB not available');
      const clicksColl = db.collection(process.env.CLICK_COLLECTION || 'clicks');
      await clicksColl.insertOne(clickDoc);
      console.log('📥 Click logged for', code);
    } catch (err) {
      console.error('Failed to insert click doc:', err);
      // continue: still attempt to redirect even if logging fails
    }

    // increment URL clicks
    try {
      if (!await ensureDb()) throw new Error('DB not available');
      const updateResult = await db.collection('urls').updateOne({ code: code }, { $inc: { clicks: 1 } });
      console.log('📈 URL clicks increment result:', updateResult.modifiedCount);
    } catch (err) {
      console.error('Failed to increment url clicks:', err);
    }

    // Redirect
    console.log('➡️ Redirecting to original URL:', item.original);
    return res.redirect(301, item.original);
  } catch (error) {
    console.error('Redirect error:', error);
    return res.status(500).json({ error: 'Server error', debug: error.message });
  }
});

/* ---------- Analytics endpoint (aggregates from clicks collection) ---------- */
/* GET /api/premium-analytics/:code?range=24h|7d|28d|3m|6m|365d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD */
app.get('/api/premium-analytics/:code', async (req, res) => {
  const shortCode = req.params.code;
  const range = (req.query.range || '24h');

  console.log('📊 /api/premium-analytics called:', { shortCode, range, query: req.query });

  try {
    if (!await ensureDb()) return res.status(500).json({ error: 'DB not available' });

    const now = new Date();
    let fromDate, toDate;

    if (range === '24h') {
      fromDate = new Date(now.getTime() - 24 * 3600 * 1000); toDate = now;
    } else if (range === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000); toDate = now;
    } else if (range === '28d') {
      fromDate = new Date(now.getTime() - 28 * 24 * 3600 * 1000); toDate = now;
    } else if (range === '3m') {
      fromDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000); toDate = now;
    } else if (range === '6m') {
      fromDate = new Date(now.getTime() - 182 * 24 * 3600 * 1000); toDate = now;
    } else if (range === '365d') {
      fromDate = new Date(now.getTime() - 365 * 24 * 3600 * 1000); toDate = now;
    } else if (range === 'custom' && req.query.from && req.query.to) {
      fromDate = new Date(req.query.from); toDate = new Date(req.query.to); toDate.setHours(23,59,59,999);
    } else {
      fromDate = new Date(now.getTime() - 24 * 3600 * 1000); toDate = now;
    }

    console.log('📊 Analytics date window:', { fromDate, toDate });

    // match window; clicks stored with timestamp: Date
    const match = {
      shortCode: shortCode,
      timestamp: { $gte: fromDate, $lte: toDate }
    };

    const clicksColl = db.collection(process.env.CLICK_COLLECTION || 'clicks');

    // ========= NEW: extra facets for generic time-series =========
    const pipeline = [
      { $match: match },
      { $facet: {
          totalClicks: [{ $count: 'count' }],
          uniqueDevices: [
            // approximated by ip + userAgent (if you later add visitorId replace this)
            { $group: { _id: { ip: "$ip", ua: "$userAgent" } } },
            { $group: { _id: null, count: { $sum: 1 } } }
          ],
          hourly: [
            { $project: { hour: { $hour: { date: "$timestamp", timezone: "UTC" } } } },
            { $group: { _id: "$hour", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],

          // 🔹 NEW: raw daily aggregation
          daily: [
            {
              $project: {
                day: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$timestamp",
                    timezone: "UTC"
                  }
                }
              }
            },
            { $group: { _id: "$day", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],

          // 🔹 NEW: raw weekly aggregation
          weekly: [
            {
              $group: {
                _id: {
                  year: { $isoWeekYear: "$timestamp" },
                  week: { $isoWeek: "$timestamp" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id.year": 1, "_id.week": 1 } }
          ],

          deviceBreakdown: [
            { $group: { _id: "$deviceType", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          browserBreakdown: [
            { $group: { _id: "$browser", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          osBreakdown: [
            { $group: { _id: "$os", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          sourceBreakdown: [
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          countryAgg: [
            { $group: { _id: "$country", count: { $sum: 1 }, sampleLat: { $first: "$latitude" }, sampleLon: { $first: "$longitude" } } },
            { $sort: { count: -1 } },
            { $limit: 50 }
          ],

          // --- NEW FACET: hourly buckets with full datetime string ---
          timeSeriesHourly: [
            {
              $project: {
                bucket: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:00",
                    date: "$timestamp",
                    timezone: "UTC"
                  }
                }
              }
            },
            { $group: { _id: "$bucket", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],

          // --- NEW FACET: daily buckets ---
          timeSeriesDaily: [
            {
              $project: {
                bucket: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$timestamp",
                    timezone: "UTC"
                  }
                }
              }
            },
            { $group: { _id: "$bucket", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]
      } }
    ];

    console.log('📊 Running aggregation pipeline for', shortCode);
    const agg = await clicksColl.aggregate(pipeline).toArray();
    const r = (agg && agg[0]) || {};

    const totalClicks = (r.totalClicks && r.totalClicks[0] && r.totalClicks[0].count) || 0;
    const uniqueDevices = (r.uniqueDevices && r.uniqueDevices[0] && r.uniqueDevices[0].count) || 0;

    console.log('📊 Aggregation raw facets:', {
      totalClicksFacet: r.totalClicks,
      uniqueDevicesFacet: r.uniqueDevices,
      hourlyCount: (r.hourly || []).length,
      dailyCount: (r.daily || []).length,            // 🔹 NEW
      weeklyCount: (r.weekly || []).length,          // 🔹 NEW
      deviceBreakdownCount: (r.deviceBreakdown || []).length,
      browserBreakdownCount: (r.browserBreakdown || []).length,
      osBreakdownCount: (r.osBreakdown || []).length,
      sourceBreakdownCount: (r.sourceBreakdown || []).length,
      countryAggCount: (r.countryAgg || []).length,
      tsHourlyCount: (r.timeSeriesHourly || []).length,
      tsDailyCount: (r.timeSeriesDaily || []).length,
    });

    // hourly normalization
    const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ _id: String(i), count: 0 }));
    (r.hourly || []).forEach(h => {
      const idx = Number(h._id);
      if (!isNaN(idx) && idx >= 0 && idx < 24) hourlyMap[idx].count = h.count;
    });

    // 🔹 NEW: daily + weekly arrays for frontend
    const dailyDistribution = (r.daily || []).map(d => ({
      _id: d._id,
      count: d.count || 0
    }));

    const weeklyDistribution = (r.weekly || []).map(w => ({
      _id: `${w._id.year}-W${String(w._id.week).padStart(2, '0')}`,
      count: w.count || 0
    }));

    // map-ready countries
    const topCountries = (r.countryAgg || []).map(c => ({
      country: c._id || 'unknown',
      clicks: c.count || 0,
      latitude: (c.sampleLat !== undefined && c.sampleLat !== null) ? Number(c.sampleLat) : null,
      longitude: (c.sampleLon !== undefined && c.sampleLon !== null) ? Number(c.sampleLon) : null
    }));

    console.log('🌍 topCountries prepared for client:', topCountries);

    // ===== NEW: build NORMALIZED timeSeries (fill missing buckets with 0) =====
    const diffMs = toDate.getTime() - fromDate.getTime();
    const oneDayMs = 24 * 3600 * 1000;
    const totalDays = Math.max(1, Math.round(diffMs / oneDayMs));

    let timeSeries = [];
    let timeSeriesGranularity = 'hour';

    const dailyRaw = r.daily || [];   // [{ _id: "YYYY-MM-DD", count }]
    const hourlyRaw = r.hourly || []; // [{ _id: 0..23, count }]

    // map "YYYY-MM-DD" -> count
    const dailyMap = new Map();
    dailyRaw.forEach(d => {
      dailyMap.set(d._id, d.count || 0);
    });

    // ---- 24 HOURS: 24 buckets 1h..24h ----
    if (range === '24h') {
      timeSeriesGranularity = 'hour';

      const hourMap = new Map();
      hourlyRaw.forEach(h => {
        const hNum = Number(h._id);
        if (!Number.isNaN(hNum)) {
          hourMap.set(hNum, h.count || 0);
        }
      });

      for (let h = 0; h < 24; h++) {
        const c = hourMap.get(h) || 0;
        timeSeries.push({ label: `${h + 1}h`, count: c });
      }
    }

    // ---- 7d / 28d / small custom: daily D1..Dn ----
    else if (range === '7d' || range === '28d' || (range === 'custom' && totalDays + 1 <= 60)) {
      timeSeriesGranularity = 'day';

      let buckets;
      if (range === '7d')       buckets = 7;
      else if (range === '28d') buckets = 28;
      else                      buckets = totalDays + 1; // custom

      for (let i = 0; i < buckets; i++) {
        const d = new Date(fromDate.getTime() + i * oneDayMs);
        const key = d.toISOString().slice(0, 10);      // "YYYY-MM-DD"
        const count = dailyMap.get(key) || 0;
        timeSeries.push({ label: `D${i + 1}`, count });
      }
    }

    // ---- 3m / 6m / 365d / big custom: week-style W1..Wn ----
    else {
      timeSeriesGranularity = 'week';

      let buckets;
      if (range === '3m')        buckets = 12;
      else if (range === '6m')   buckets = 26;
      else if (range === '365d') buckets = 52;
      else                       buckets = Math.min(52, Math.max(4, Math.round(totalDays / 7)));

      const bucketCounts = new Array(buckets).fill(0);

      dailyRaw.forEach(row => {
        const d = new Date(row._id + 'T00:00:00Z');  // row._id is "YYYY-MM-DD"
        const offsetDays = Math.floor((d.getTime() - fromDate.getTime()) / oneDayMs);
        if (offsetDays < 0 || offsetDays > totalDays) return;

        const idx = Math.floor(offsetDays * buckets / totalDays);
        const safeIdx = Math.min(Math.max(idx, 0), buckets - 1);
        bucketCounts[safeIdx] += row.count || 0;
      });

      for (let i = 0; i < buckets; i++) {
        timeSeries.push({ label: `W${i + 1}`, count: bucketCounts[i] });
      }
    }

    res.json({
      // meta for graph
      range,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      timeSeriesGranularity,
      timeSeries,

      // explicit series
      dailyDistribution,
      weeklyDistribution,

      // existing fields
      totalClicks,
      uniqueDevices,
      conversionRate: null, // not tracked in current schema
      hourlyDistribution: hourlyMap,
      deviceBreakdown: r.deviceBreakdown || [],
      browserBreakdown: r.browserBreakdown || [],
      osBreakdown: r.osBreakdown || [],
      sourceBreakdown: r.sourceBreakdown || [],
      topCountries
    });

  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to compute analytics', details: err.message });
  }
});

/* ---------- Waitlist API ---------- */
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;
  console.log('📥 /api/waitlist called with email:', email);

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const item = { email, createdAt: new Date().toISOString(), source: 'website_waitlist' };
    if (!await ensureDb()) throw new Error('DB not available');
    await db.collection('waitlist').insertOne(item);
    console.log('📥 Waitlist email saved:', item);
    return res.json({ ok: true, message: 'Added to waitlist' });
  } catch (err) {
    console.error('Error saving to waitlist', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
/* ---------- Feedback API ---------- */
app.post('/api/feedback', async (req, res) => {
  const { feedback, email, suggestions } = req.body || {};
  console.log('📝 /api/feedback called with:', { email, feedback, suggestions });

  if (!feedback || !email) {
    return res.status(400).json({ error: 'Feedback and email are required' });
  }

  try {
    const item = {
      feedback,
      email,
      suggestions: suggestions || [],
      createdAt: new Date().toISOString(),
      source: 'website_feedback'
    };

    if (!await ensureDb()) throw new Error('DB not available');
    await db.collection('feedback').insertOne(item);   // new "feedback" collection

    console.log('📝 Feedback saved:', item);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error handling feedback POST', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


/* ---------- Newsletter API ---------- */
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  console.log('📧 /api/newsletter called with:', email);

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const item = { email, createdAt: new Date().toISOString() };
    
    if (!await ensureDb()) throw new Error('DB not available');
    await db.collection('newsletter').insertOne(item);

    console.log('📧 Newsletter email saved:', item);
    return res.json({ ok: true, message: 'Subscribed successfully!' });
  } catch (err) {
    console.error('Error saving newsletter', err);
    return res.status(500).json({ error: 'Server error' });
  }
});



/* ---------- Debug routes ---------- */
app.get('/api/debug/urls', async (req, res) => {
  try {
    const urls = await loadUrls();
    res.json({ totalUrls: urls.length, urls: urls.map(u => ({ code: u.code, original: u.original, createdAt: u.createdAt })) });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});
app.get('/api/debug/urls/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const urls = await loadUrls();
    const item = urls.find(u => u.code === code);
    res.json({ code, exists: !!item, item });
  } catch (error) {
    res.json({ error: error.message });
  }
});


/* ---------- SPA fallback ---------- */
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running at http://127.0.0.1:${PORT}`));
