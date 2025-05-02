import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  TextField,
  Divider,
  Paper,
  Button,
  CircularProgress,
  Stack,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, ShoppingCart as ShoppingCartIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartPage = () => {
  const { cartItems, updateCartItem, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    updateCartItem(productId, newQuantity);
  };

  const handleRemoveItem = (productId) => {
    removeFromCart(productId);
  };

  const handleCheckout = () => {
    setLoading(true);
    // Xử lý thanh toán
    setTimeout(() => {
      setLoading(false);
      alert('Chức năng thanh toán đang được phát triển!');
    }, 1000);
  };

  const handleContinueShopping = () => {
    navigate('/products_page');
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      // Sử dụng giá đã giảm giá nếu có
      const price = getItemPrice(item.product);
      return total + (price * item.quantity);
    }, 0);
  };

  const getItemPrice = (product) => {
    // Kiểm tra nếu có discount
    if (product.discount && product.discount.type) {
      const now = new Date();
      if (
        product.discount.startDate &&
        new Date(product.discount.startDate) > now
      ) return product.price;
      
      if (product.discount.endDate && 
          new Date(product.discount.endDate) < now
      ) return product.price;
      
      // Tính giá sau khi giảm giá
      return product.discount.type === "percentage"
        ? product.price * (1 - product.discount.value / 100)
        : Math.max(0, product.price - product.discount.value);
    }
    return product.price;
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2, mx: 'auto' }} />
        <Typography variant="h5" gutterBottom>
          Giỏ hàng của bạn đang trống
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bạn chưa thêm sản phẩm nào vào giỏ hàng.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleContinueShopping}
          sx={{ maxWidth: 300, mx: 'auto' }}
        >
          Tiếp tục mua sắm
        </Button>
      </Container>
    );
  }

  return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2 
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Giỏ hàng của bạn
          </Typography>

          <Button
            variant="outlined"
            onClick={handleContinueShopping}
          >
            Tiếp tục mua sắm
          </Button>
        </Box>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  {cartItems.length} sản phẩm trong giỏ hàng
                </Typography>
                <Button color="error" startIcon={<DeleteIcon />} onClick={() => clearCart()}>
                  Xóa tất cả
                </Button>
              </Box>
            </Paper>
            
            <Box 
              sx={{ 
              maxHeight: '70vh', 
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#555',
              },
            }}
          >
            {cartItems.map((item) => (
              <Card key={item.product._id} sx={{ mb: 2, overflow: 'visible' }}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item xs={3} sm={2}>
                    <CardMedia
                      component="img"
                      image={item.product.images?.[0] || 'https://placehold.co/300x200?text=No+Image'}
                      alt={item.product.name}
                      sx={{ height: 100, objectFit: 'contain', p: 1 }}
                    />
                  </Grid>
                  <Grid item xs={9} sm={10}>
                    <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" component="h3" noWrap sx={{ maxWidth: { xs: '150px', sm: '300px' } }}>
                          {item.product.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(item.product._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Đơn vị: {item.product.selectedUnit}
                      </Typography>
                      
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                        <Box>
                          {item.product.discount && (
                            <Typography variant="caption" color="error" sx={{ textDecoration: 'line-through', display: 'block' }}>
                              {formatCurrency(item.product.price)}
                            </Typography>
                          )}
                          <Typography variant="body1" color="primary" fontWeight="bold">
                            {formatCurrency(getItemPrice(item.product))}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(item.product._id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.product._id, parseInt(e.target.value) || 1)}
                            inputProps={{ min: 1, style: { textAlign: 'center', padding: '4px' } }}
                            sx={{ width: 40, mx: 1 }}
                          />
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(item.product._id, item.quantity + 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Stack>
                      
                      <Typography variant="body2" align="right" sx={{ mt: 1 }}>
                        Thành tiền: <b>{formatCurrency(getItemPrice(item.product) * item.quantity)}</b>
                      </Typography>
                    </CardContent>
                  </Grid>
                </Grid>
              </Card>
            ))}
          </Box>
          
          
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Tóm tắt đơn hàng
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Tạm tính ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)</Typography>
              <Typography>
                {formatCurrency(calculateTotal())}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography>Phí vận chuyển</Typography>
              <Typography>Miễn phí</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Tổng cộng</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(calculateTotal())}
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              color="primary"
              onClick={handleCheckout}
            >
              Tiến hành thanh toán
            </Button>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Đơn hàng sẽ được xử lý và vận chuyển trong vòng 24h
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CartPage;