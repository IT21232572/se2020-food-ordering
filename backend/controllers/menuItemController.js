const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

exports.createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, stockQuantity } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const newItem = new MenuItem({
      name, description, price, category, stockQuantity, imageUrl
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

exports.getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const updatedData = req.body;
    if (req.file) {
      updatedData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const item = await MenuItem.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

exports.getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    // Check if any orders exist for this item
    const existingOrders = await Order.findOne({ menuItemId: req.params.id });
    
    if (existingOrders) {
      return res.status(400).json({ 
        message: 'Cannot delete this menu item because it is tied to existing orders.' 
      });
    }

    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};