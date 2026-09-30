const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createMenuItem, updateMenuItem, getAllMenuItems, deleteMenuItem } = require('../controllers/menuItemController');
// Assuming you have an auth/admin middleware. If not, omit it for now.
const auth = require('../middleware/authMiddleware'); 

// Configure Multer to save files in the 'uploads' folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Creates a unique filename: timestamp-originalName
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Update your POST and PUT routes to accept a single file named 'image'
router.post('/', auth, upload.single('image'), createMenuItem);
router.put('/:id', auth, upload.single('image'), updateMenuItem);

router.get('/', getAllMenuItems);
router.delete('/:id', auth, deleteMenuItem);

module.exports = router;