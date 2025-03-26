import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, InputLabel, FormControl,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Checkbox, FormControlLabel,
  Paper, Stack, TableContainer, useMediaQuery, useTheme
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

    axios.get('http://localhost:8000/api/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error(err));
  }, []);

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
        sendEmail, // Gửi email nếu được chọn
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
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 4 }}>
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
              sx={{ height: '56px', width:"150px" }}
            >
              Thêm
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {orderItems.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tên sản phẩm</TableCell>
                  <TableCell>Số lượng</TableCell>
                  <TableCell>Giá</TableCell>
                  <TableCell>Xóa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.price.toLocaleString()} VND</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleRemoveItem(item.productId)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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