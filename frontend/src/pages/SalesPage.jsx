import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';

const SalesPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    axios.get('http://localhost:8000/api/products')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setProducts(data);
      })
      .catch(err => {
        console.error(err);
        setProducts([]); // Fallback to an empty array on error
      });
  }, []);

  const addToCart = (product) => {
    setCart(prev => [...prev, { ...product, quantity: 1 }]);
  };

  const handleCheckout = () => {
    if (!customerInfo.name || !customerInfo.phone) {
      setSnackbar({ open: true, message: 'Vui lòng nhập thông tin khách hàng!', severity: 'error' });
      return;
    }

    const order = {
      customerDetails: customerInfo,
      items: cart.map(({ _id, quantity }) => ({ product: _id, quantity })),
    };

    axios.post('http://localhost:8000/api/orders', order)
      .then(() => {
        setSnackbar({ open: true, message: 'Đặt hàng thành công!', severity: 'success' });
        setCart([]);
        setOpenDialog(false);
      })
      .catch(err => {
        console.error(err);
        setSnackbar({ open: true, message: 'Đặt hàng thất bại!', severity: 'error' });
      });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" mb={3}>Trang Bán Hàng</Typography>
      <Grid container spacing={3}>
        {products.map(product => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={product.images?.[0] || '/placeholder.png'}
                alt={product.name}
              />
              <CardContent>
                <Typography variant="h6">{product.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {product.price.toLocaleString()} đ
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => addToCart(product)}
                  sx={{ mt: 2 }}
                >
                  Thêm vào giỏ
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        color="secondary"
        onClick={() => setOpenDialog(true)}
        disabled={cart.length === 0}
        sx={{ mt: 3 }}
      >
        Thanh Toán
      </Button>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Thông Tin Khách Hàng</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên Khách Hàng"
            fullWidth
            margin="normal"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
          />
          <TextField
            label="Số Điện Thoại"
            fullWidth
            margin="normal"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button onClick={handleCheckout} variant="contained" color="primary">Xác Nhận</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesPage;
