import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, InputLabel, FormControl,
  IconButton, Checkbox, FormControlLabel, Paper, Stack, useMediaQuery, useTheme, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import axios from 'axios';

const UNITS = ['thùng', 'bao', 'chai', 'gói', 'hộp'];

const CreatePurchaseOrder = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [conversionRate, setConversionRate] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
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
    if (!selectedProduct || quantity <= 0 || !unit || unitPrice <= 0 || conversionRate <= 0) return;
    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;

    const existing = orderItems.find(item => item.productId === selectedProduct);
    if (existing) {
      alert('Sản phẩm đã có trong danh sách!');
      return;
    }

    setOrderItems([
      ...orderItems,
      {
        productId: selectedProduct,
        name: product.name,
        quantity: Number(quantity),
        unit,
        conversionRate: Number(conversionRate),
        unitPrice: Number(unitPrice)
      }
    ]);

    // Reset input
    setSelectedProduct('');
    setQuantity(1);
    setUnit('');
    setConversionRate(1);
    setUnitPrice('');
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        supplierId: selectedSupplier,
        items: orderItems.map(({ productId, quantity, unit, conversionRate, unitPrice }) => ({
          productId,
          quantity,
          unit,
          conversionRate,
          unitPrice
        })),
        totalPrice: calculateTotal(),
        sendEmail,
      };

      await axios.post('http://localhost:8000/api/purchaseOrder', payload);
      alert('Tạo phiếu đặt hàng thành công!');
      setSelectedSupplier('');
      setOrderItems([]);
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tạo phiếu!');
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
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

          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Sản phẩm</InputLabel>
                <Select
                  value={selectedProduct}
                  label="Sản phẩm"
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  {products.map(p => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                label="Số lượng"
                type="number"
                fullWidth
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Đơn vị</InputLabel>
                <Select
                  value={unit}
                  label="Đơn vị"
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNITS.map(u => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                label="Quy đổi"
                type="number"
                fullWidth
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <TextField
                label="Đơn giá (VNĐ)"
                type="number"
                fullWidth
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />
            </Grid>

            <Grid item xs={12} sm={1}>
              <Button
                variant="contained"
                onClick={handleAddItem}
                sx={{ height: '100%' }}
              >
                <AddIcon />
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {orderItems.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Danh sách sản phẩm đã chọn
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Đơn vị</th>
                  <th>SL</th>
                  <th>Quy đổi</th>
                  <th>SL nhỏ nhất</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.unit}</td>
                    <td>
                      <IconButton onClick={() => updateQuantity(item.productId, -1)}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      {item.quantity}
                      <IconButton onClick={() => updateQuantity(item.productId, 1)}>
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </td>
                    <td>{item.conversionRate}</td>
                    <td>{item.quantity * item.conversionRate}</td>
                    <td>{item.unitPrice.toLocaleString()} đ</td>
                    <td>{(item.quantity * item.unitPrice).toLocaleString()} đ</td>
                    <td>
                      <IconButton onClick={() => handleRemoveItem(item.productId)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Typography variant="h6" align="right" mt={2}>
            Tổng tiền: <strong>{calculateTotal().toLocaleString()} đ</strong>
          </Typography>
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
