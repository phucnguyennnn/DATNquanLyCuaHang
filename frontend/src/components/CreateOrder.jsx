import React, { useState } from "react";
import {
  Container,
  Grid,
  Paper,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Card,
  CardContent,
  Typography,
  Button,
  CardActions,
  ListItem,
  IconButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  OutlinedInput,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const categories = [
  "Tất cả",
  "Thực phẩm tươi sống",
  "Đồ uống",
  "Hóa mỹ phẩm",
  "Đồ dùng gia đình",
  "Khác",
];

const sampleProducts = [
  { id: 1, name: "Sữa tươi Vinamilk", code: "VM-SUA-001", price: 35000 },
  { id: 2, name: "Bánh mì hoa cúc", code: "BM-HC-002", price: 25000 },
  { id: 3, name: "Nước ngọt Coca-Cola", code: "CC-NG-003", price: 12000 },
  { id: 4, name: "Nước giặt Omo", code: "OMO-HG-004", price: 85000 },
];

function CreateOrder() {
  const [orderItems, setOrderItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [filteredProducts, setFilteredProducts] = useState(sampleProducts);

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    filterProducts(term, selectedCategory);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    filterProducts(searchTerm, category);
  };

  const filterProducts = (term, category) => {
    let results = sampleProducts;
    if (term) {
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          product.code.toLowerCase().includes(term.toLowerCase())
      );
    }
    if (category !== "Tất cả") {
    }
    setFilteredProducts(results);
  };

  const handleAddToCart = (product) => {
    const existingItem = orderItems.find((item) => item.id === product.id);
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([...orderItems, { ...product, quantity: 1 }]);
    }
  };

  const handleChangeQuantity = (itemId, quantity) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === itemId && quantity > 0 ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const handlePayment = (paymentMethod) => {
    alert(
      `Thanh toán thành công bằng ${paymentMethod}! Tổng tiền: ${calculateTotal().toLocaleString(
        "vi-VN"
      )} VNĐ`
    );
    setOrderItems([]);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, height: "100vh" }}>
      <Grid container spacing={3} sx={{ height: "100%" }}>
        <Grid item xs={12} md={7} sx={{ height: "100%" }}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <TextField
              label="Tìm kiếm sản phẩm"
              variant="outlined"
              fullWidth
              size="small"
              sx={{ mb: 1 }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Box sx={{ flexShrink: 0 }}>
              <List sx={{ display: "flex", flexWrap: "wrap", p: 0 }}>
                {categories.map((category) => (
                  <ListItemButton
                    key={category}
                    selected={selectedCategory === category}
                    onClick={() => handleCategoryClick(category)}
                    sx={{
                      width: "auto",
                      mr: 1,
                      mb: 1,
                      borderRadius: 2,
                      px: 2,
                      bgcolor:
                        selectedCategory === category ? "#1976d2" : "inherit",
                      color: selectedCategory === category ? "#fff" : "inherit",
                    }}
                  >
                    <ListItemText primary={category} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
              <Grid container spacing={2}>
                {filteredProducts.map((product) => (
                  <Grid item xs={12} sm={6} key={product.id}>
                    <Card sx={{ mb: 1 }}>
                      <CardContent>
                        <Typography variant="h6">{product.name}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          Mã: {product.code}
                        </Typography>
                        <Typography variant="body2">
                          Giá: {product.price.toLocaleString("vi-VN")} VNĐ
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleAddToCart(product)}
                        >
                          Thêm
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5} sx={{ height: "100%" }}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Đơn hàng
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
              <List>
                {orderItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={item.name}
                      secondary={`Giá: ${item.price.toLocaleString(
                        "vi-VN"
                      )} VNĐ`}
                    />
                    <OutlinedInput
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) =>
                        handleChangeQuantity(item.id, parseInt(e.target.value))
                      }
                      inputProps={{ min: 1 }}
                      sx={{ width: 80 }}
                    />
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Box>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
              Tổng tiền: {calculateTotal().toLocaleString("vi-VN")} VNĐ
            </Typography>
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <RadioGroup
                aria-label="payment-method"
                name="paymentMethod"
                defaultValue="cash"
                onChange={(event) => handlePayment(event.target.value)}
              >
                <FormControlLabel
                  value="cash"
                  control={<Radio />}
                  label="Tiền mặt"
                />
                <FormControlLabel
                  value="transfer"
                  control={<Radio />}
                  label="Chuyển khoản"
                />
                <FormControlLabel
                  value="credit-card"
                  control={<Radio />}
                  label="Thẻ tín dụng"
                />
              </RadioGroup>
            </FormControl>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default CreateOrder;
