const express = require('express');
const router = express.Router();
const { createOrder, getAllOrders, getOrderById, updateOrder, deleteOrder } = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

// We add "auth" as the second parameter to protect these routes
router.post('/', auth, createOrder);
router.get('/', auth, getAllOrders);
router.get('/:id', auth, getOrderById);
router.put('/:id', auth, updateOrder);
router.delete('/:id', auth, deleteOrder);

module.exports = router;