import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Paper,
  Box,
  Divider,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const authToken = localStorage.getItem("authToken");

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const { data } = await axios.get("http://localhost:8000/api/cart", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setCart(data);
    } catch (error) {
      console.error("Lỗi khi lấy giỏ hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCartToServer = async (itemsToSend) => {
    setUpdating(true);
    try {
      await axios.post("http://localhost:8000/api/cart/add", itemsToSend, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await fetchCart();
    } catch (error) {
      console.error("Lỗi khi cập nhật giỏ hàng:", error);
      alert("Có lỗi xảy ra khi cập nhật giỏ hàng");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityChange = async (itemIndex, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      setUpdating(true);
      const updatedItem = cart.items[itemIndex];
      await axios.put(
        `http://localhost:8000/api/cart/update/${updatedItem.product._id}`,
        {
          quantity: newQuantity,
          selectedUnitName: updatedItem.selectedUnitName
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await fetchCart();
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      alert("Có lỗi xảy ra khi cập nhật số lượng");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (productId, selectedUnitName) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")) {
      try {
        await axios.delete(
          `http://localhost:8000/api/cart/remove/${productId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { selectedUnitName },
          }
        );
        await fetchCart();
      } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        alert("Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ hàng.");
      }
    }
  };

  const handleClearCart = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?")) {
      try {
        await axios.delete("http://localhost:8000/api/cart", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setCart(null);
      } catch (error) {
        console.error("Lỗi khi xóa giỏ hàng:", error);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ display: "flex", justifyContent: "center", pt: 4 }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
      >
        <ShoppingCartCheckoutIcon sx={{ mr: 1, fontSize: "2rem" }} />
        Giỏ hàng của bạn
      </Typography>

      {!cart?.items?.length ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Giỏ hàng của bạn đang trống
          </Typography>
          <Button variant="contained" href="/products_page">
            Tiếp tục mua sắm
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8} sx={{ height: '70vh', overflow: 'hidden' }}>
            <List sx={{
              bgcolor: "background.paper",
              height: '100%',
              overflowY: 'auto',
              pr: 2,
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
              '&::-webkit-scrollbar-thumb': { 
                background: '#888',
                borderRadius: '4px',
              },
            }}>
              {cart.items.map((item, index) => (
                <Paper key={item._id} sx={{ mb: 2, p: 2 }}>
                  <ListItem sx={{ position: "relative" }}>
                    {updating && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: "rgba(255,255,255,0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CircularProgress size={24} />
                      </Box>
                    )}

                    <ListItemAvatar>
                      <Avatar
                        src={item.product.images[0]}
                        alt={item.product.name}
                        sx={{ width: 80, height: 80, mr: 2, borderRadius: 2 }}
                        variant="rounded"
                      />
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {item.product.name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Đơn vị: {item.selectedUnitName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Đơn giá: {formatCurrency(item.unitPrice)}
                          </Typography>
                        </>
                      }
                    />

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                          onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          disabled={updating}
                        >
                          <RemoveIcon />
                        </IconButton>

                        <TextField
                          value={item.quantity}
                          size="small"
                          sx={{ width: 60 }}
                          inputProps={{
                            min: 1,
                            type: "number",
                            style: { textAlign: "center" },
                          }}
                          onChange={(e) =>
                            handleQuantityChange(index, parseInt(e.target.value) || 1)
                          }
                          disabled={updating}
                        />

                        <IconButton
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          disabled={updating}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>

                      <Typography
                        variant="h6"
                        sx={{ minWidth: 120, textAlign: "right" }}
                      >
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Typography>

                      <IconButton
                        onClick={() =>
                          handleRemoveItem(item.product._id, item.selectedUnitName)
                        }
                        color="error"
                        disabled={updating}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItem>
                </Paper>
              ))}
            </List>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: "sticky", top: 16 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Đơn hàng
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="body1">Tạm tính:</Typography>
                <Typography variant="body1">
                  {formatCurrency(cart?.total || 0)}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1">Thành tiền:</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                  {formatCurrency(cart?.total || 0)}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mb: 2 }}
                href="/checkout"
                disabled={updating || !cart?.items?.length}
              >
                Đặt hàng 
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleClearCart}
                disabled={updating || !cart?.items?.length}
              >
                Xóa giỏ hàng
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default CartPage;