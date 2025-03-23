import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, InputLabel, FormControl,
  IconButton, Checkbox, FormControlLabel, Paper, Stack, useMediaQuery, useTheme, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const CreatePurchaseOrder = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState([]);
  const [sendEmail, setSendEmail] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    axios.get('http://localhost:8000/api/suppliers')
      .then(res => setSuppliers(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      fetchProductsBySupplier(selectedSupplier);
      setOrderItems([]);
    } else {
      setProducts([]);
      setOrderItems([]);
    }
  }, [selectedSupplier]);

  const fetchProductsBySupplier = async (supplierId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/suppliers/${supplierId}/products`);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sản phẩm:', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) return;
    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    const existing = orderItems.find(item => item.productId === selectedProduct);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        item.productId === selectedProduct
          ? { ...item, quantity: item.quantity + Number(quantity) }
          : item
      ));
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: selectedProduct,
          name: product.name,
          quantity: Number(quantity),
          price: product.price
        }
      ]);
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        supplierId: selectedSupplier,
        items: orderItems.map(({ productId, quantity, price }) => ({
          productId,
          quantity,
          price
        })),
        sendEmail,
      };

      await axios.post('http://localhost:8000/api/purchaseOrder/', payload);
      alert('Tạo phiếu đặt mua hàng thành công!');
      setSelectedSupplier('');
      setOrderItems([]);
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tạo phiếu!');
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 4, height: '100vh', overflowY: 'auto' }}>
      <Typography variant="h4" mb={4} fontWeight="bold">
        Tạo phiếu đặt mua hàng
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Chọn nhà cung cấp</InputLabel>
            <Select
              value={selectedSupplier}
              label="Chọn nhà cung cấp"
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              {suppliers.map(sup => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Chọn sản phẩm</InputLabel>
              <Select
                value={selectedProduct}
                label="Chọn sản phẩm"
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                {products.map(p => (
                  <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Số lượng"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              sx={{ height: '56px', width: "150px" }}
            >
              Thêm
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {orderItems.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4, flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            Danh sách sản phẩm đã chọn
          </Typography>

          <Box
            sx={{
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Grid container spacing={2}>
              {orderItems.map((item, index) => (
                <Grid item xs={12} key={index}>
                  <Grid container alignItems="center" justifyContent="space-between">
                    <Grid item xs={6}>
                      <Typography>{item.name}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography>Số lượng: {item.quantity}</Typography>
                    </Grid>
                    <Grid item xs={3} sx={{ textAlign: 'right' }}>
                      <IconButton onClick={() => handleRemoveItem(item.productId)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
        }
        label="Gửi email xác nhận cho nhà cung cấp"
        sx={{ mb: 3 }}
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={!selectedSupplier || orderItems.length === 0}
        fullWidth
        size="large"
      >
        Tạo phiếu đặt hàng
      </Button>
    </Box>
  );
};

export default CreatePurchaseOrder;