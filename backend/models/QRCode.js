const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    urlId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Url',
        required: true
    },
    qrImage: {
        type: String, // Base64 encoded QR code image
        required: true
    },
    customization: {
        foregroundColor: {
            type: String,
            default: '#000000'
        },
        backgroundColor: {
            type: String,
            default: '#ffffff'
        },
        hasLogo: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        enum: ['active', 'paused'],
        default: 'active'
    },
    scans: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
qrCodeSchema.index({ userId: 1, createdAt: -1 });
qrCodeSchema.index({ urlId: 1 });
qrCodeSchema.index({ status: 1 });

module.exports = mongoose.model('QRCode', qrCodeSchema);
