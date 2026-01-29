const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    items: [{
        contentType: { type: String, enum: ['text', 'link', 'image', 'video'], required: true },
        textData: String,
        fileUrl: String,
        cloudinaryPublicId: String
    }],
    passwordHash: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    sessionDurationMinutes: {
        type: Number,
        required: true
    },
    maxViews: {
        type: Number,
        default: 1
    },
    viewCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// TTL Index for automatic deletion
contentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Content', contentSchema);
