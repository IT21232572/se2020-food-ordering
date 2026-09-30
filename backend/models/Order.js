const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Preparing', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);