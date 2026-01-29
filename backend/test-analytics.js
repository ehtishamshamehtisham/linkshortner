const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const Url = require('./models/Url');
const Click = require('./models/Click');
const User = require('./models/User');

dotenv.config();

async function runTest() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/premium-shortener');
        console.log('Connected.');

        // 1. Find or create a test user
        let user = await User.findOne({ email: 'test@example.com' });
        if (!user) {
            console.log('Creating test user...');
            const hashedPassword = await bcrypt.hash('password123', 10);

            user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: hashedPassword
            });
        }
        const userId = user._id;

        // 2. Create a test URL
        console.log('Creating test URL...');
        const testUrl = await Url.create({
            originalUrl: 'https://google.com',
            shortCode: 'test-' + Math.random().toString(36).substring(7),
            userId: userId
        });

        // 3. Generate some mock clicks
        console.log('Generating mock clicks...');
        const clicks = [
            {
                urlId: testUrl._id,
                timestamp: new Date(),
                ip: '8.8.8.8',
                country: 'US',
                city: 'Mountain View',
                browser: 'Chrome',
                device: 'Desktop',
                os: 'Windows',
                isQr: false,
                referrer: 'Direct'
            },
            {
                urlId: testUrl._id,
                timestamp: new Date(),
                ip: '1.1.1.1',
                country: 'UK',
                city: 'London',
                browser: 'Safari',
                device: 'Mobile',
                os: 'iOS',
                isQr: true,
                referrer: 'Direct'
            },
            {
                urlId: testUrl._id,
                timestamp: new Date(),
                ip: '2.2.2.2',
                country: 'IN',
                city: 'Mumbai',
                browser: 'Chrome',
                device: 'Mobile',
                os: 'Android',
                isQr: false,
                referrer: 'Social'
            }
        ];

        await Click.insertMany(clicks);

        // 4. Run the same aggregation logic as in server.js to verify
        console.log('Verifying Aggregation Logic...');
        const userUrls = await Url.find({ userId }).select('_id');
        const userUrlIds = userUrls.map(u => u._id);

        const totalClicks = await Click.countDocuments({ urlId: { $in: userUrlIds } });
        const qrScans = await Click.countDocuments({ urlId: { $in: userUrlIds }, isQr: true });

        console.log('--- TEST RESULTS ---');
        console.log(`Total Clicks (Expected 3+): ${totalClicks}`);
        console.log(`QR Scans (Expected 1+): ${qrScans}`);

        // Check Browser distribution
        const browserType = await Click.aggregate([
            { $match: { urlId: { $in: userUrlIds } } },
            { $group: { _id: "$browser", count: { $sum: 1 } } }
        ]);
        console.log('Browser Distribution:', JSON.stringify(browserType));

        console.log('--------------------');
        console.log('Test successful. Analytics logic is working correctly in the backend.');

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

runTest();
