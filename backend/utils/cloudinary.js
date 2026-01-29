const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Disk Storage for temporary scan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../temp_uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

/**
 * Manually upload a file to Cloudinary
 * @param {string} filePath - Local path to the file
 * @param {string} resourceType - 'image' or 'video'
 */
const uploadToCloudinary = async (filePath, resourceType = 'auto') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'secureshare_uploads',
            resource_type: resourceType
        });
        return result;
    } catch (error) {
        console.error('Cloudinary manual upload error:', error);
        throw error;
    }
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};

module.exports = { cloudinary, upload, uploadToCloudinary, deleteFromCloudinary };
