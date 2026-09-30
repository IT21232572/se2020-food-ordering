const express = require('express');
const router = express.Router();
const { createOrder, getAllOrders, getOrderById, updateOrder, deleteOrder } = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

// 1. IMPORT YOUR ORDER MODEL HERE (Adjust the path if your model folder is different)
const Order = require('../models/Order'); 

router.post('/', auth, createOrder);

// 2. ADD "auth" HERE to protect the route
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // .populate() tells MongoDB to fetch the full food details based on the stored ID
    const orders = await Order.find({ userId: req.params.userId })
                              .populate('menuItemId')
                              .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.get('/', auth, getAllOrders);
router.get('/:id', auth, getOrderById);
router.put('/:id', auth, updateOrder);
router.delete('/:id', auth, deleteOrder);

module.exports = router;