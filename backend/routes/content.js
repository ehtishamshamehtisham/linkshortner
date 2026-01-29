const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const Content = require('../models/Content');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { moderateImage } = require('../utils/moderator');

// Specific Rate Limiters
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour per IP
    message: 'Upload limit reached. Please try again later.'
});

const accessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 mins (prevents brute force)
    message: 'Too many password attempts. Please try again in 15 minutes.'
});

// Helper for structured logging
const logEvent = (action, status, details = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ACTION: ${action} | STATUS: ${status} | DETAILS: ${JSON.stringify(details)}`);
};

// @route   POST /api/content/upload
// @desc    Upload any combination of text, link, and files
router.post('/upload', uploadLimiter, upload.array('files', 5), async (req, res) => {
    const tempFiles = req.files || [];

    try {
        const { textData, linkData, password, expiryMinutes, maxViews } = req.body;

        if (!password || !expiryMinutes) {
            logEvent('UPLOAD', 'FAILED', { reason: 'Missing password/expiry' });
            cleanupFiles(tempFiles);
            return res.status(400).json({ message: 'Password and expiry are required' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // GLOBAL EXPIRY: Set to 24 hours as a safety buffer. 
        // Individual views will use sessionDurationMinutes for their own timers.
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const sessionDurationMinutes = parseInt(expiryMinutes) || 60;
        const items = [];

        // 1. Handle Text
        if (textData && textData.trim()) {
            items.push({ contentType: 'text', textData: textData.trim() });
        }

        // 2. Handle Link
        if (linkData && linkData.trim()) {
            items.push({ contentType: 'link', textData: linkData.trim() });
        }

        // 3. Handle Files (Moderation & Cloudinary Upload)
        if (tempFiles.length > 0) {
            for (const file of tempFiles) {
                const isImage = file.mimetype.startsWith('image/');
                const type = isImage ? 'image' : 'video';

                // Moderation Check for Images
                if (isImage) {
                    const moderation = await moderateImage(file.path);

                    if (moderation.status === 'blocked') {
                        logEvent('MODERATION', 'BLOCKED', { file: file.originalname, reason: moderation.reason });
                        cleanupFiles(tempFiles);
                        return res.status(400).json({
                            message: `Content rejected: Explicit content detected in image "${file.originalname}". Our policy strictly prohibits NSFW content.`
                        });
                    } else if (moderation.status === 'error') {
                        logEvent('MODERATION', 'ERROR', { file: file.originalname, error: moderation.error });
                        cleanupFiles(tempFiles);
                        return res.status(500).json({
                            message: `Moderation Error: Image "${file.originalname}" could not be scanned. Please try again or use a different image format.`
                        });
                    }
                }

                // Proceed to Cloudinary Upload
                try {
                    const result = await uploadToCloudinary(file.path, type);
                    items.push({
                        contentType: type,
                        fileUrl: result.secure_url,
                        cloudinaryPublicId: result.public_id
                    });
                } catch (err) {
                    logEvent('UPLOAD', 'CLOUDINARY_ERROR', { file: file.originalname, error: err.message });
                    throw err; // Trigger global catch
                }
            }
        }

        if (items.length === 0) {
            cleanupFiles(tempFiles);
            return res.status(400).json({ message: 'Please provide at least one piece of content (text, link, or file)' });
        }

        const newContent = new Content({
            items,
            passwordHash,
            expiresAt,
            sessionDurationMinutes,
            maxViews: parseInt(maxViews) || 1
        });

        await newContent.save();
        cleanupFiles(tempFiles);

        logEvent('UPLOAD', 'SUCCESS', { id: newContent._id, itemCount: items.length });

        res.status(201).json({
            message: 'Secure share created successfully',
            shareId: newContent._id,
            expiresAt: newContent.expiresAt
        });

    } catch (error) {
        logEvent('UPLOAD', 'ERROR', { error: error.message });
        cleanupFiles(tempFiles);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

// Helper to delete temp files
function cleanupFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}

// @route   POST /api/content/access/:id
// @desc    Unlock content with password (One-time access)
router.post('/access/:id', accessLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        const content = await Content.findById(req.params.id);

        if (!content) {
            logEvent('ACCESS', 'NOT_FOUND', { id: req.params.id });
            return res.status(404).json({ message: 'Content not found or expired' });
        }

        if (content.viewCount >= content.maxViews) {
            logEvent('ACCESS', 'EXPIRED_VIEWS', { id: req.params.id, views: content.viewCount, max: content.maxViews });
            return res.status(403).json({ message: 'View limit reached for this link' });
        }

        if (new Date() > content.expiresAt) {
            logEvent('ACCESS', 'EXPIRED', { id: req.params.id, expiry: content.expiresAt });
            return res.status(410).json({ message: 'Content has expired' });
        }

        const isMatch = await bcrypt.compare(password, content.passwordHash);
        if (!isMatch) {
            logEvent('ACCESS', 'WRONG_PASSWORD', { id: req.params.id });
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Increment view count
        content.viewCount += 1;
        await content.save();

        logEvent('ACCESS', 'SUCCESS', { id: req.params.id, items: content.items.length });

        // Return all items
        const responseData = {
            items: content.items,
            createdAt: content.createdAt,
            expiresAt: content.expiresAt,
            sessionDurationMinutes: content.sessionDurationMinutes
        };

        res.status(200).json(responseData);

    } catch (error) {
        logEvent('ACCESS', 'ERROR', { id: req.params.id, error: error.message });
        res.status(500).json({ message: 'Server error during access' });
    }
});

// @route   GET /api/content/admin/list
// @desc    Admin: List all content metadata
router.get('/admin/list', async (req, res) => {
    try {
        const uploads = await Content.find().select('-passwordHash');
        res.status(200).json(uploads);
    } catch (error) {
        res.status(500).json({ message: 'Admin list error' });
    }
});

// @route   DELETE /api/content/admin/:id
// @desc    Admin: Delete content manually
router.delete('/admin/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content) return res.status(404).json({ message: 'Not found' });

        // Delete all media items from Cloudinary
        for (const item of content.items) {
            if (item.cloudinaryPublicId) {
                await deleteFromCloudinary(item.cloudinaryPublicId, item.contentType);
            }
        }

        await Content.findByIdAndDelete(req.params.id);
        logEvent('ADMIN_DELETE', 'SUCCESS', { id: req.params.id });
        res.status(200).json({ message: 'Content and associated files deleted' });
    } catch (error) {
        logEvent('ADMIN_DELETE', 'ERROR', { id: req.params.id, error: error.message });
        res.status(500).json({ message: 'Admin delete error' });
    }
});

module.exports = router;
