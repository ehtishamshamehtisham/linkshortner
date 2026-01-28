const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Url = require('./models/Url');
const Click = require('./models/Click');
const User = require('./models/User');
const QRCode = require('./models/QRCode');
const QRCodeLib = require('qrcode');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files from frontend folder

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/premium-shortener')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// --- MIDDLEWARE ---
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.user.id);

        if (!user) return res.status(401).json({ error: 'User does not exist' });

        // Invalidate session if password version changed
        if (decoded.user.version !== user.passwordVersion) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded.user;
        next();
    } catch (err) {
        next();
    }
};

// --- AUTH ROUTES ---

// 1. Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User already exists' });

        user = new User({ username, email, password });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT
        const payload = { user: { id: user.id, version: user.passwordVersion } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, username: user.username });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid Credentials' });

        const payload = { user: { id: user.id, version: user.passwordVersion } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, username: user.username });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Get Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Update Profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    try {
        const { username, avatar } = req.body;
        const user = await User.findById(req.user.id);

        if (username) user.username = username;
        if (avatar !== undefined) user.avatar = avatar;

        await user.save();
        res.json({ message: 'Profile updated', username: user.username, avatar: user.avatar });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. Update Password
app.put('/api/auth/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password incorrect' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordVersion += 1; // Invalidate all other sessions

        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- API ROUTES ---

const Message = require('./models/ContactMessage');

// --- CONTACT ENDPOINT ---
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const newMessage = new Message({ name, email, subject, message });
        await newMessage.save();

        // In a real app, you would use nodemailer or SendGrid here
        // Sending email to: mdehtisham2019@gmail.com
        console.log(`[CONTACT FORM] Email Notification to: mdehtisham2019@gmail.com`);
        console.log(`
            From: ${name} (${email})
            Subject: ${subject}
            Message: ${message}`);

        res.json({ success: true, message: 'Message received successfully' });
    } catch (err) {
        console.error('Contact API Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 1. Shorten URL (Optional Auth)
app.post('/api/shorten', optionalAuth, async (req, res) => {
    try {
        const { originalUrl, alias, caption } = req.body;

        // Basic Validation
        if (!originalUrl) return res.status(400).json({ error: 'URL is required' });

        // Check for existing alias if provided
        if (alias) {
            const existing = await Url.findOne({ shortCode: alias });
            if (existing) return res.status(400).json({ error: 'Alias already in use' });
        }

        const url = new Url({
            originalUrl,
            shortCode: alias || undefined, // undefined triggers default nanoid
            caption,
            userId: req.user ? req.user.id : undefined
        });

        await url.save();

        // Automatically generate QR code if user is logged in
        if (req.user) {
            try {
                const qrCode = new QRCode({
                    userId: req.user.id,
                    urlId: url._id,
                    customization: {
                        foregroundColor: '#5b13ec', // Default brand color
                        backgroundColor: '#ffffff'
                    }
                });

                const shortUrl = `${req.protocol}://${req.get('host')}/${url.shortCode}?qr=true&qrId=${qrCode._id}`;
                const qrImage = await QRCodeLib.toDataURL(shortUrl, {
                    color: {
                        dark: '#5b13ec',
                        light: '#ffffff'
                    },
                    width: 300,
                    margin: 2
                });

                qrCode.qrImage = qrImage;
                await qrCode.save();
            } catch (qrErr) {
                console.error('Failed to auto-generate QR code:', qrErr);
            }
        }

        res.json(url);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. List User Links (With Filters, Sorting, and Pagination)
app.get('/api/links', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { search = '', sort = 'newest', status = 'all', page = 1, limit = 40 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let query = { userId };

        if (search) {
            query.$or = [
                { originalUrl: { $regex: search, $options: 'i' } },
                { shortCode: { $regex: search, $options: 'i' } },
                { caption: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        else if (sort === 'clicks') sortOption = { clicks: -1 };
        else if (sort === 'clicks-asc') sortOption = { clicks: 1 };

        const totalCount = await Url.countDocuments(query);
        const links = await Url.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        res.json({
            links,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
                limit: limitNum
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Update Link
app.put('/api/links/:id', authMiddleware, async (req, res) => {
    try {
        const { originalUrl, alias, caption } = req.body;
        const link = await Url.findById(req.params.id);

        if (!link) return res.status(404).json({ error: 'Link not found' });
        if (link.userId.toString() !== req.user.id) {
            return res.status(401).json({ error: 'User not authorized' });
        }

        if (originalUrl) link.originalUrl = originalUrl;
        if (caption !== undefined) link.caption = caption;

        if (alias && alias !== link.shortCode) {
            const existing = await Url.findOne({ shortCode: alias });
            if (existing) return res.status(400).json({ error: 'Alias already in use' });
            link.shortCode = alias;
        }

        await link.save();
        res.json({ message: 'Link updated successfully', link });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Delete Link
app.delete('/api/links/:id', authMiddleware, async (req, res) => {
    try {
        const link = await Url.findById(req.params.id);

        if (!link) return res.status(404).json({ error: 'Link not found' });

        // Ensure user owns the link
        if (link.userId.toString() !== req.user.id) {
            return res.status(401).json({ error: 'User not authorized' });
        }

        await link.deleteOne();

        // Also delete associated clicks and QR codes
        await Click.deleteMany({ urlId: link._id });
        await QRCode.deleteMany({ urlId: link._id });

        res.json({ message: 'Link removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Get Analytics Overview (Auth Required)
app.get('/api/analytics-data', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { range = '24h', startDate, endDate, linkId } = req.query;

        const userUrls = await Url.find({ userId }).select('_id');
        const userUrlIds = userUrls.map(u => u._id);

        // Date Filter Logic
        let dateFilter = { urlId: { $in: userUrlIds } };

        // Apply Link Filter if requested and belongs to user
        if (linkId) {
            if (userUrlIds.some(id => id.toString() === linkId)) {
                dateFilter.urlId = new mongoose.Types.ObjectId(linkId);
            } else {
                return res.status(403).json({ error: 'Unauthorized access to this link stats' });
            }
        }

        const now = new Date();

        if (range === 'custom' && startDate && endDate) {
            dateFilter.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        } else if (range && range !== 'custom') {
            let start = new Date();
            if (range === '24h') start.setHours(now.getHours() - 24);
            else if (range === '7d') start.setDate(now.getDate() - 7);
            else if (range === '30d') start.setDate(now.getDate() - 30);
            else if (range === '3m') start.setMonth(now.getMonth() - 3);
            else if (range === '6m') start.setMonth(now.getMonth() - 6);
            else if (range === '1y') start.setFullYear(now.getFullYear() - 1);

            dateFilter.timestamp = { $gte: start };
        }

        const totalClicks = await Click.countDocuments(dateFilter);
        const uniqueVisitors = await Click.distinct('ip', dateFilter).then(ips => ips.length);
        const qrScans = await Click.countDocuments({ ...dateFilter, isQr: true });

        // Top Link
        const topLinkAgg = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$urlId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        let topLinkTitle = "N/A";
        let topLinkCount = 0;

        if (topLinkAgg.length > 0) {
            const topUrl = await Url.findById(topLinkAgg[0]._id);
            if (topUrl) {
                topLinkTitle = topUrl.shortCode;
                topLinkCount = topLinkAgg[0].count;
            }
        }

        // Determine Time Buckets
        let start = new Date();
        let end = new Date();
        let bucketSize = 86400000; // 1 day
        let numBuckets = 7;

        if (range === '24h') {
            start.setHours(now.getHours() - 24);
            bucketSize = 3600000;
            numBuckets = 24;
        } else if (range === '7d') {
            start.setDate(now.getDate() - 7);
            bucketSize = 86400000;
            numBuckets = 7;
        } else if (range === '30d') {
            start.setDate(now.getDate() - 30);
            bucketSize = Math.floor((86400000 * 30) / 4);
            numBuckets = 4;
        } else if (range === '3m') {
            start.setMonth(now.getMonth() - 3);
            bucketSize = Math.floor((86400000 * 90) / 6);
            numBuckets = 6;
        } else if (range === '6m') {
            start.setMonth(now.getMonth() - 6);
            bucketSize = Math.floor((86400000 * 180) / 6);
            numBuckets = 6;
        } else if (range === '1y') {
            start.setFullYear(now.getFullYear() - 1);
            bucketSize = Math.floor((86400000 * 365) / 12);
            numBuckets = 12;
        } else if (range === 'custom' && startDate && endDate) {
            start = new Date(startDate);
            end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            bucketSize = Math.max(1, Math.floor((end - start) / 10));
            numBuckets = 10;
        }

        const clicksOverTimeData = await Click.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: { $floor: { $divide: [{ $subtract: ["$timestamp", start] }, bucketSize] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        let clicksOverTime = [];
        for (let i = 0; i < numBuckets; i++) {
            const match = clicksOverTimeData.find(c => c._id === i);
            clicksOverTime.push({ _id: i.toString(), count: match ? match.count : 0 });
        }

        // Traffic Sources
        const trafficSources = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$referrer", count: { $sum: 1 } } }
        ]);

        // Device Type
        const deviceType = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$device", count: { $sum: 1 } } }
        ]);

        // Browser
        const browserType = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$browser", count: { $sum: 1 } } }
        ]);

        // Top Performing Links (Top 5)
        const topLinksAgg = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$urlId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const locations = await Click.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const topPerformingLinks = await Promise.all(topLinksAgg.map(async (item) => {
            const url = await Url.findById(item._id);
            return {
                shortCode: url ? url.shortCode : 'N/A',
                originalUrl: url ? url.originalUrl : '#',
                createdAt: url ? url.createdAt : new Date(),
                clicks: item.count
            };
        }));

        // Recent Activity
        const recentActivity = await Click.find(dateFilter).sort({ timestamp: -1 }).limit(6).populate('urlId');


        res.json({
            summary: {
                totalClicks,
                uniqueVisitors,
                qrScans,
                topLink: { title: topLinkTitle, count: topLinkCount }
            },
            charts: {
                clicksOverTime,
                trafficSources,
                deviceType,
                browserType,
                locations,
                topPerformingLinks
            },
            recentActivity
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// QR Code Endpoints

// Generate QR Code for existing URL
app.post('/api/qr/generate', authMiddleware, async (req, res) => {
    try {
        const { urlId, foregroundColor = '#000000', backgroundColor = '#ffffff', hasLogo = false } = req.body;

        // Verify URL belongs to user
        const url = await Url.findOne({ _id: urlId, userId: req.user.id });
        if (!url) return res.status(404).json({ error: 'URL not found' });

        // Check if QR already exists for this URL
        let qrCode = await QRCode.findOne({ urlId });

        if (qrCode) {
            // Update existing QR code
            qrCode.customization = { foregroundColor, backgroundColor, hasLogo };
        } else {
            // Create new QR code
            qrCode = new QRCode({
                userId: req.user.id,
                urlId,
                customization: { foregroundColor, backgroundColor, hasLogo }
            });
        }

        // Generate QR code image
        const shortUrl = `${req.protocol}://${req.get('host')}/${url.shortCode}?qr=true&qrId=${qrCode._id}`;
        const qrImage = await QRCodeLib.toDataURL(shortUrl, {
            color: {
                dark: foregroundColor,
                light: backgroundColor
            },
            width: 300,
            margin: 2
        });

        qrCode.qrImage = qrImage;
        await qrCode.save();

        res.json(qrCode);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get QR Codes List with filters and pagination
app.get('/api/qr/list', authMiddleware, async (req, res) => {
    try {
        const { search, status, dateRange, startDate, endDate, caption, page = 1, limit = 15 } = req.query;

        // Build filter
        let filter = { userId: req.user.id };

        // Status filter
        if (status && status !== 'all') {
            filter.status = status;
        }

        // Date filter
        if (dateRange || (startDate && endDate)) {
            const now = new Date();
            let start = new Date();

            if (dateRange === '24h') {
                start.setHours(now.getHours() - 24);
                filter.createdAt = { $gte: start };
            } else if (dateRange === '7d') {
                start.setDate(now.getDate() - 7);
                filter.createdAt = { $gte: start };
            } else if (dateRange === '3m') {
                start.setMonth(now.getMonth() - 3);
                filter.createdAt = { $gte: start };
            } else if (dateRange === 'custom' && startDate && endDate) {
                start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        // If searching or filtering by caption, we need to find matching Url IDs first
        let urlIdsMatch = null;
        if (search || (caption && caption !== 'all')) {
            let urlQuery = { userId: req.user.id };
            if (search) {
                urlQuery.$or = [
                    { originalUrl: { $regex: search, $options: 'i' } },
                    { shortCode: { $regex: search, $options: 'i' } },
                    { caption: { $regex: search, $options: 'i' } }
                ];
            }
            if (caption && caption !== 'all') {
                urlQuery.caption = caption;
            }
            const matchingUrls = await Url.find(urlQuery).select('_id');
            urlIdsMatch = matchingUrls.map(u => u._id);
            filter.urlId = { $in: urlIdsMatch };
        }

        const total = await QRCode.countDocuments(filter);
        const qrCodes = await QRCode.find(filter)
            .populate('urlId')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        // Get all unique captions for filter dropdown
        const allUrls = await Url.find({ userId: req.user.id, caption: { $exists: true, $ne: '' } });
        const captions = [...new Set(allUrls.map(u => u.caption))];

        res.json({
            qrCodes,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            captions,
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update QR Code Status
app.put('/api/qr/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const qrCode = await QRCode.findOne({ _id: req.params.id, userId: req.user.id });

        if (!qrCode) return res.status(404).json({ error: 'QR Code not found' });

        qrCode.status = status;
        await qrCode.save();

        res.json(qrCode);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// 3. Get Recent Links (for Dashboard)
app.get('/api/urls/recent', optionalAuth, async (req, res) => {
    try {
        let filter = {};
        if (req.user) {
            filter = { userId: req.user.id };
        } else {
            // If not logged in, maybe show only public/global or none.
            // Let's show nothing or only links with no userId (public)
            filter = { userId: { $exists: false } };
        }
        const urls = await Url.find(filter).sort({ createdAt: -1 }).limit(6);
        res.json(urls);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// 4. Redirect Endpoint (Must be last)
app.get('/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });

        if (url) {
            // Async Log the click to not block redirect
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const userAgentString = req.headers['user-agent'];
            const ua = UAParser(userAgentString);
            const geo = geoip.lookup(ip) || {};

            const referrer = req.headers['referer'] || 'Direct';
            const querySource = req.query.source || req.query.ref || req.query.utm_source;

            // Categorize Referrer Detailed
            let source = 'Direct';
            const refLower = referrer.toLowerCase();

            // Priority 1: Query Parameters
            if (querySource) {
                const qs = querySource.toLowerCase();
                if (qs === 'fb' || qs === 'facebook') source = 'Facebook';
                else if (qs === 'ig' || qs === 'instagram') source = 'Instagram';
                else if (qs === 'tk' || qs === 'tiktok') source = 'TikTok';
                else if (qs === 'wa' || qs === 'whatsapp') source = 'WhatsApp';
                else if (qs === 'tw' || qs === 'twitter') source = 'Twitter';
                else if (qs === 'mail' || qs === 'email') source = 'Mail';
                else if (qs === 'qr') source = 'QR Code';
                else source = querySource.charAt(0).toUpperCase() + querySource.slice(1);
            }
            // Priority 2: Referrer Header
            else if (refLower.includes('facebook') || refLower.includes('fb.me') || refLower.includes('m.facebook.com')) source = 'Facebook';
            else if (refLower.includes('instagram.com')) source = 'Instagram';
            else if (refLower.includes('tiktok.com')) source = 'TikTok';
            else if (refLower.includes('t.co') || refLower.includes('twitter.com')) source = 'Twitter';
            else if (refLower.includes('wa.me') || refLower.includes('whatsapp.com')) source = 'WhatsApp';
            else if (refLower.includes('mail.google.com') || refLower.includes('outlook.com')) source = 'Mail';
            else if (refLower.includes('google.com') || refLower.includes('bing.com')) source = 'Search Engine';
            else if (referrer !== 'Direct') source = 'Referral';

            // Determine Device Detailed
            let device = 'Desktop';
            if (ua.device.model === 'iPad') device = 'iPad';
            else if (ua.device.model === 'iPhone') device = 'iPhone';
            else if (ua.device.type === 'mobile') device = 'Mobile';
            else if (ua.device.type === 'tablet') device = 'Tablet';
            else if (ua.device.type === 'smarttv') device = 'Smart TV';
            else if (ua.device.model) device = ua.device.model;

            let browser = ua.browser.name || 'Unknown';
            if (browser.includes('Chrome')) browser = 'Chrome';
            else if (browser.includes('Safari')) browser = 'Safari';
            else if (browser.includes('Firefox')) browser = 'Firefox';
            else if (browser.includes('Edge')) browser = 'Edge';
            else if (browser.includes('Opera')) browser = 'Opera';

            const isQrScan = req.query.qr === 'true' || req.query.source === 'qr';
            const qrCodeId = req.query.qrId || null;

            Click.create({
                urlId: url._id,
                ip,
                country: geo.country || 'Unknown',
                city: geo.city || 'Unknown',
                device: device,
                browser: browser,
                os: ua.os.name || 'Unknown',
                referrer: source,
                isQr: isQrScan,
                qrCodeId: qrCodeId
            }).catch(console.error); // Fire and forget logging

            // Increment QR scan count if applicable
            if (isQrScan && qrCodeId) {
                QRCode.findByIdAndUpdate(qrCodeId, { $inc: { scans: 1 } }).catch(console.error);
            }

            // Increment clicks
            url.clicks++;
            await url.save();

            return res.redirect(url.originalUrl);
        } else {
            return res.status(404).send('URL not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
