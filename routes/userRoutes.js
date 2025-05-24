const express = require('express');
const { updateUser, changePin, uploadAvatar, getUserAvatar } = require('../controllers/userController'); // Added uploadAvatar, getUserAvatar
const { protect } = require('../middlewares/authMiddleware'); // Corrected middleware import path
const multer = require('multer');

const router = express.Router();

// Configure multer for memory storage (stores file in buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

router.put('/update', protect, updateUser);
router.put('/change-pin', protect, changePin);
router.put('/avatar', protect, upload.single('avatar'), uploadAvatar); // New route for avatar upload
router.get('/:userId/avatar', getUserAvatar); // New route to get avatar (can be public or protected based on needs)

module.exports = router;