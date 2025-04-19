const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { isValidObjectId } = require('mongoose');

// Tạo hoặc cập nhật giỏ hàng
exports.createOrUpdateCart = async (req, res) => {
  try {
    const { productId, quantity, unit } = req.body; // Include unit in the request

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Product not found or inactive' });
    }

    // Find the unit with the matching name and get its salePrice
    const selectedUnit = product.units.find(u => u.name === unit);
    if (!selectedUnit) {
      return res.status(400).json({ message: `Unit '${unit}' not found for product ${product.name}` });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      // Tạo giỏ hàng mới nếu chưa có
      cart = new Cart({
        user: req.user._id,
        items: [{ product: productId, quantity, unit, price: selectedUnit.salePrice }],
        total: selectedUnit.salePrice * quantity,
      });
    } else {
      // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId && item.unit === unit
      );

      if (itemIndex > -1) {
        // Cập nhật số lượng nếu sản phẩm đã có
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Thêm sản phẩm mới vào giỏ hàng
        cart.items.push({ product: productId, quantity, unit, price: selectedUnit.salePrice });
      }

      // Tính lại tổng tiền
      cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    await cart.save();

    res.status(200).json({
      message: 'Cart updated successfully',
      cart: await cart.populate('items.product', 'name units images'),
    });
  } catch (error) {
    console.error('Cart update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông tin giỏ hàng
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name units images');

    if (!cart) {
      return res.status(200).json({
        items: [],
        total: 0,
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa sản phẩm khỏi giỏ hàng
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, unit } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Lọc ra sản phẩm cần xóa
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId || item.unit !== unit
    );

    // Tính lại tổng tiền
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await cart.save();

    res.status(200).json({
      message: 'Product removed from cart',
      cart: await cart.populate('items.product', 'name units images'),
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOneAndDelete({ user: req.user._id });

    res.status(200).json({
      message: 'Cart cleared successfully',
      cart: null,
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
