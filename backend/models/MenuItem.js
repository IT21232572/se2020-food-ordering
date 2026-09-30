const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  availabilityStatus: { type: String, enum: ['In Stock', 'Out of Stock'], default: 'In Stock' },
  imageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);