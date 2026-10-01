const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

exports.createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;
    let calculatedTotal = 0;

    // 1. Verify stock for all items before saving anything
    for (const item of items) {
      const menuDoc = await MenuItem.findById(item.menuItemId);
      if (!menuDoc) return res.status(404).json({ message: 'Item not found' });
      if (menuDoc.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${menuDoc.name}` });
      }
      calculatedTotal += (menuDoc.price * item.quantity);
    }

    // 2. Deduct stock for all items
    for (const item of items) {
      const menuDoc = await MenuItem.findById(item.menuItemId);
      menuDoc.stockQuantity -= item.quantity;
      if (menuDoc.stockQuantity === 0) {
        menuDoc.availabilityStatus = 'Out of Stock';
      }
      await menuDoc.save();
    }

    // 3. Create the single grouped order
    const newOrder = new Order({
      userId,
      items,
      totalPrice: calculatedTotal,
      status: 'Pending'
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// Fetch orders for a specific user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.id })
      .populate('items.menuItemId') // Populates the nested menu item reference
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user orders', error: error.message });
  }
};

// Fetch all orders for the admin dashboard
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('items.menuItemId') // Populates the nested array reference
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all orders', error: error.message });
  }
};

// Add this inside controllers/orderController.js
exports.updateOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let newTotal = 0;

    // 1. Process stock differences for each item
    for (const reqItem of items) {
      const menuItemId = reqItem.menuItemId._id || reqItem.menuItemId;
      const menuDoc = await MenuItem.findById(menuItemId);
      
      if (!menuDoc) return res.status(404).json({ message: 'Menu item not found' });

      // Find the old quantity for this specific item in the original order
      const oldItem = order.items.find(i => i.menuItemId.toString() === menuItemId.toString());
      const oldQuantity = oldItem ? oldItem.quantity : 0;
      
      // Calculate the difference (Positive = adding more items, Negative = removing items)
      const quantityDifference = reqItem.quantity - oldQuantity;

      // Check if there is enough stock for an increase
      if (quantityDifference > 0 && menuDoc.stockQuantity < quantityDifference) {
        return res.status(400).json({ message: `Not enough stock for ${menuDoc.name} to increase order` });
      }

      // Adjust stock based on the difference 
      // (Subtracts if they added more, Adds back to stock if they reduced the order)
      menuDoc.stockQuantity -= quantityDifference;

      // Update availability status
      if (menuDoc.stockQuantity <= 0) {
        menuDoc.availabilityStatus = 'Out of Stock';
      } else {
        menuDoc.availabilityStatus = 'In Stock';
      }

      await menuDoc.save();

      // Calculate the new grand total
      newTotal += (menuDoc.price * reqItem.quantity);
    }

    // 2. Update the order array and total price
    order.items = items.map(i => ({
       menuItemId: i.menuItemId._id || i.menuItemId,
       quantity: i.quantity
    }));
    order.totalPrice = newTotal;

    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

// Update an order's status (Admin marking Completed, or User Cancelling)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Business Logic: If the order is being cancelled, return all items to stock
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (menuItem) {
          menuItem.stockQuantity += item.quantity;
          menuItem.availabilityStatus = 'In Stock';
          await menuItem.save();
        }
      }
    }

    order.status = status;
    await order.save();
    
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
};

// Delete order entirely
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Business Logic: Restore stock ONLY if the order wasn't already cancelled
    if (order.status !== 'Cancelled') {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        if (menuItem) {
          menuItem.stockQuantity += item.quantity;
          menuItem.availabilityStatus = 'In Stock';
          await menuItem.save();
        }
      }
    }

    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Order deleted successfully and stock restored' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};