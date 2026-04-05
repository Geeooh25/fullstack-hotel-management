const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const guestDocumentsDir = path.join(__dirname, '../public/uploads/guest-documents');
const roomImagesDir = path.join(__dirname, '../public/uploads/room-images');

if (!fs.existsSync(guestDocumentsDir)) {
    fs.mkdirSync(guestDocumentsDir, { recursive: true });
}
if (!fs.existsSync(roomImagesDir)) {
    fs.mkdirSync(roomImagesDir, { recursive: true });
}

// Configure storage for guest documents
const guestDocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, guestDocumentsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `guest-${req.params.id || 'temp'}-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for room images
const roomImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, roomImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `room-${req.params.id || 'temp'}-${uniqueSuffix}${ext}`);
    }
});

// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and PDF documents are allowed'));
    }
};

// Multer instances
const uploadGuestDocument = multer({
    storage: guestDocumentStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: documentFilter
});

const uploadRoomImage = multer({
    storage: roomImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: imageFilter
});

// Single file upload middleware
const singleGuestDocument = (fieldName = 'document') => uploadGuestDocument.single(fieldName);
const singleRoomImage = (fieldName = 'image') => uploadRoomImage.single(fieldName);

// Multiple files upload
const multipleRoomImages = (fieldName = 'images', maxCount = 5) => uploadRoomImage.array(fieldName, maxCount);

module.exports = {
    uploadGuestDocument,
    uploadRoomImage,
    singleGuestDocument,
    singleRoomImage,
    multipleRoomImages
};