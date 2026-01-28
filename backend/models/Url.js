const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
    },
    shortCode: {
        type: String,
        required: true,
        unique: true,
        default: () => nanoid(6), // Generate 6-char unique ID
    },
    caption: {
        type: String,
    },
    clicks: {
        type: Number,
        default: 0,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Url', urlSchema);
