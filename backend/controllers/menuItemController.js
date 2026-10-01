const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

exports.createMenuItem = async (req, res) => {
  try {
    const { name, price, category, stockQuantity, availabilityStatus } = req.body;
    
    // If multer successfully saved the file, it will be in req.file
    // We create the URL path to save in MongoDB
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const newItem = await MenuItem.create({
      name,
      price,
      category,
      stockQuantity,
      availabilityStatus,
      imageUrl // Save the generated URL to the database
    });

    res.status(201).json(newItem);
  } catch (error) {
    // This forces the error to print in the Render Live Tail
    console.error("Create Item Error:", error); 
    res.status(500).json({ message: 'Error creating menu item', error: error.message });
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
    // Check if any PENDING orders exist for this item
    const pendingOrders = await Order.findOne({ 
      menuItemId: req.params.id,
      status: 'Pending' 
    });

    if (pendingOrders) {
      return res.status(400).json({ 
        message: 'Cannot delete this menu item because it is tied to active pending orders.' 
      });
    }

    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};