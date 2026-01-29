const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const rateLimit = require('express-rate-limit');

// Strict rate limiting for contact form (5 per hour per IP)
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many messages sent from this IP, please try again after an hour'
});

router.post('/', contactLimiter, async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Basic Validation
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Create new contact
        const newContact = new Contact({
            name,
            email,
            message
        });

        // Save to DB
        await newContact.save();

        res.status(201).json({ message: 'Message saved successfully' });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
