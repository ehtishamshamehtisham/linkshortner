const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    urlId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Url',
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    ip: String,
    country: String,
    city: String,
    device: String, // e.g., Mobile, Desktop
    browser: String, // e.g., Chrome, Safari
    os: String, // e.g., Windows, iOS
    referrer: String, // e.g., Direct, google.com
    isQr: {
        type: Boolean,
        default: false,
    },
    qrCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QRCode',
        default: null
    },
});

module.exports = mongoose.model('Click', clickSchema);
