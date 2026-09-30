const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

exports.createOrder = async (req, res) => {
  try {
    const { userId, menuItemId, quantity } = req.body;

    // 1. Find the menu item
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });

    // 2. Core Business Logic: Check stock availability
    if (menuItem.stockQuantity < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }

    // 3. Dynamic logic: Calculate total price
    const totalPrice = menuItem.price * quantity;

    // 4. Create the order
    const newOrder = new Order({
      userId,
      menuItemId,
      quantity,
      totalPrice,
      status: 'Pending'
    });

    // 5. Update inventory stock and status
    menuItem.stockQuantity -= quantity;
    if (menuItem.stockQuantity === 0) {
      menuItem.availabilityStatus = 'Out of Stock';
    }

    await menuItem.save();
    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    // Populate fetches the actual user and menu item data instead of just the ID
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('menuItemId');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name').populate('menuItemId', 'name price');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { quantity, status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const menuItem = await MenuItem.findById(order.menuItemId);

    // 1. Handle Quantity Update (True CRUD)
    if (quantity && quantity !== order.quantity) {
      const quantityDifference = quantity - order.quantity;

      // Check if there is enough stock for an increase
      if (quantityDifference > 0 && menuItem.stockQuantity < quantityDifference) {
        return res.status(400).json({ message: 'Not enough stock to increase order' });
      }

      // Adjust the stock based on the difference
      menuItem.stockQuantity -= quantityDifference;
      
      // Update availability status
      if (menuItem.stockQuantity === 0) {
        menuItem.availabilityStatus = 'Out of Stock';
      } else {
        menuItem.availabilityStatus = 'In Stock';
      }

      // Business Logic: Recalculate total price
      order.quantity = quantity;
      order.totalPrice = menuItem.price * quantity;
    }

    // 2. Handle Status Update (e.g., Cancelling)
    if (status && status !== order.status) {
      if (status === 'Cancelled' && order.status !== 'Cancelled') {
        // Return the current order quantity back to stock
        menuItem.stockQuantity += order.quantity;
        menuItem.availabilityStatus = 'In Stock';
      }
      order.status = status;
    }

    await menuItem.save();
    await order.save();
    
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    // 1. Find the order first so we know how much quantity to return
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 2. Business Logic: Restore stock ONLY if the order wasn't already cancelled
    // (Because if it was already cancelled, the stock was already returned!)
    if (order.status !== 'Cancelled') {
      const menuItem = await MenuItem.findById(order.menuItemId);
      if (menuItem) {
        menuItem.stockQuantity += order.quantity;
        menuItem.availabilityStatus = 'In Stock';
        await menuItem.save();
      }
    }

    // 3. Now delete the order from the database
    await Order.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Order deleted successfully and stock restored' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};

// Fetch all orders for the Admin
exports.getAllOrdersForAdmin = async (req, res) => {
  try {
    // .populate() pulls in the actual user name and food name instead of just the IDs
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('menuItemId', 'name price')
      .sort({ createdAt: -1 }); // Newest orders first
      
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all orders', error: error.message });
  }
};

// Update an order's status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { returnDocument: 'after' }
    );
    
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
};