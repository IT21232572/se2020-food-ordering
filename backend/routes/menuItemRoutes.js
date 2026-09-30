const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { createMenuItem, getAllMenuItems, updateMenuItem, getMenuItemById, deleteMenuItem } = require('../controllers/menuItemController');

// The "image" string must match the form-data key in Postman/React Native
router.post('/', upload.single('image'), createMenuItem);
router.get('/', getAllMenuItems);
router.put('/:id', upload.single('image'), updateMenuItem);
router.get('/:id', getMenuItemById);
router.delete('/:id', deleteMenuItem);

module.exports = router;