const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getUserOrders, 
  getAllOrders, 
  updateOrder,
  updateOrderStatus, 
  deleteOrder 
} = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

// Create a new grouped order
router.post('/', auth, createOrder);

// Get all orders for a specific user
router.get('/user/:id', auth, getUserOrders);

// Get all orders for the admin dashboard
router.get('/', auth, getAllOrders);

// Update order status (Admin completing, or User cancelling)
router.put('/:id/status', auth, updateOrderStatus);

// Delete an order entirely
router.delete('/:id', auth, deleteOrder);
router.put('/:id', auth, updateOrder);

module.exports = router;