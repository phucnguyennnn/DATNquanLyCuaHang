import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Grid, // Removed Grid
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
  Collapse,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack, // Added Stack
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ShopIcon from "@mui/icons-material/Shop"; // Added ShopIcon
import { useNavigate } from "react-router-dom";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const CustomerProfile = ({ customer, onClose }) => (
  <Dialog open={!!customer} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Thông tin cá nhân</DialogTitle>
    <DialogContent>
      {customer ? (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Avatar
              alt={customer.fullName}
              src={customer.profileImage}
              sx={{ width: 80, height: 80 }}
            />
          </Box>
          <Typography variant="h6" component="div" gutterBottom align="center">
            {customer.fullName}
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            gutterBottom
            align="center"
          >
            @{customer.username}
          </Typography>
          <Divider sx={{ width: "80%", my: 2 }} />
          <Stack spacing={1} sx={{ width: "100%", textAlign: "center" }}>
            <Typography variant="body2">Email: {customer.email}</Typography>
            {customer.phone && (
              <Typography variant="body2">
                Điện thoại: {customer.phone}
              </Typography>
            )}
            {customer.address && (
              <Typography variant="body2">
                Địa chỉ: {customer.address.street}, {customer.address.city},{" "}
                {customer.address.state}, {customer.address.postalCode},{" "}
                {customer.address.country}
              </Typography>
            )}
            {customer.dateOfBirth && (
              <Typography variant="body2">
                Ngày sinh: {formatDate(customer.dateOfBirth)}
              </Typography>
            )}
            {customer.gender && (
              <Typography variant="body2">
                Giới tính: {customer.gender}
              </Typography>
            )}
          </Stack>
        </Paper>
      ) : (
        <Typography>Không có thông tin người dùng.</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Đóng</Button>
    </DialogActions>
  </Dialog>
);

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [creatingPreorder, setCreatingPreorder] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userID");
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [openOrdersDialog, setOpenOrdersDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);

  const authHeader = useCallback(
    () => ({
      headers: { Authorization: `Bearer ${authToken}` },
    }),
    [authToken]
  );

  const fetchCart = useCallback(async () => {
    try {
      const { data } = await axios.get(
        "http://localhost:8000/api/cart",
        authHeader()
      );
      setCart(data);
    } catch (error) {
      console.error("Lỗi khi lấy giỏ hàng:", error);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchOrders = useCallback(
    async (userId) => {
      setLoadingOrders(true);
      try {
        const { data } = await axios.get(
          `http://localhost:8000/api/orders?customerId=${userId}`,
          authHeader()
        );
        setOrders(data);
      } catch (error) {
        console.error("Lỗi khi lấy đơn hàng:", error);
      } finally {
        setLoadingOrders(false);
      }
    },
    [authHeader]
  );

  const fetchUserInfo = useCallback(async () => {
    if (userId) {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/user/${userId}`,
          authHeader()
        );
        setCustomerInfo(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
      }
    } else {
      setCustomerInfo(null);
    }
  }, [userId, authHeader]);

  useEffect(() => {
    fetchCart();
    if (userId && openOrdersDialog) {
      fetchOrders(userId);
    } else if (userId && !openOrdersDialog && orders.length > 0) {
      setOrders([]);
    }

    if (userId && openProfileDialog) {
      fetchUserInfo();
    } else {
      setCustomerInfo(null);
    }
  }, [
    userId,
    openOrdersDialog,
    fetchCart,
    fetchOrders,
    openProfileDialog,
    fetchUserInfo,
  ]);

  const updateCartToServer = async (itemsToSend) => {
    setUpdating(true);
    try {
      await axios.post(
        "http://localhost:8000/api/cart/add",
        itemsToSend,
        authHeader()
      );
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
          selectedUnitName: updatedItem.selectedUnitName,
        },
        authHeader()
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
    if (
      window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")
    ) {
      try {
        await axios.delete(
          `http://localhost:8000/api/cart/remove/${productId}`,
          {
            headers: authHeader().headers,
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
        await axios.delete("http://localhost:8000/api/cart", authHeader());
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

  const handleCreatePreorder = async () => {
    if (!cart?.items?.length) {
      alert("Giỏ hàng của bạn đang trống.");
      return;
    }

    setCreatingPreorder(true);
    try {
      const response = await axios.post(
        "http://localhost:8000/api/orders",
        {
          orderType: "preorder",
          cartId: cart._id,
        },
        authHeader()
      );
      console.log("Đơn hàng preorder đã được tạo:", response.data);
      alert("Đơn hàng preorder đã được tạo thành công!");
      await fetchCart();
      if (userId && openOrdersDialog) {
        fetchOrders(userId);
      }
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng preorder:", error);
      alert("Có lỗi xảy ra khi tạo đơn hàng preorder.");
    } finally {
      setCreatingPreorder(false);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    setOpenProfileDialog(true);
    handleMenuClose();
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
  };

  const handleOrdersClick = () => {
    setOpenOrdersDialog(true);
    if (userId && !openOrdersDialog) {
      fetchOrders(userId);
    }
    handleMenuClose();
  };

  const handleCloseOrdersDialog = () => {
    setOpenOrdersDialog(false);
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
    handleMenuClose();
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userID");
    navigate("/login");
    setOpenLogoutDialog(false);
  };

  const handleCloseLogoutDialog = () => {
    setOpenLogoutDialog(false);
  };

  const handleGoToProducts = () => {
    navigate("/products_page");
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <IconButton onClick={handleGoToProducts}>
          <ShopIcon sx={{ fontSize: "2rem" }} />
        </IconButton>
        <IconButton onClick={handleMenuOpen}>
          <AccountCircleIcon sx={{ fontSize: "2rem" }} />
        </IconButton>
        <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
          <MenuItem onClick={handleProfileClick}>Hồ sơ</MenuItem>
          <MenuItem onClick={handleOrdersClick}>Đơn đặt hàng</MenuItem>
          <MenuItem onClick={handleLogoutClick}>Đăng xuất</MenuItem>
        </Menu>
      </Box>

      <CustomerProfile
        customer={customerInfo}
        onClose={handleCloseProfileDialog}
      />

      <Dialog
        open={openOrdersDialog}
        onClose={handleCloseOrdersDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Đơn hàng của bạn</DialogTitle>
        <DialogContent>
          {loadingOrders ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : orders?.length > 0 ? (
            <List>
              {orders.map((order) => (
                <Paper key={order._id} sx={{ mb: 2, p: 2 }}>
                  <ListItem
                    secondaryAction={
                      <IconButton onClick={() => toggleOrderDetails(order._id)}>
                        {expandedOrderId === order._id ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`Mã đơn hàng: ${order.orderNumber}`}
                      secondary={`Ngày đặt: ${new Date(
                        order.createdAt
                      ).toLocaleDateString()} - Tổng tiền: ${formatCurrency(
                        order.finalAmount
                      )} - Trạng thái: ${
                        order.paymentStatus === "unpaid"
                          ? "Chưa thanh toán"
                          : order.paymentStatus
                      } ${
                        order.expirationDate
                          ? `- Hạn nhận hàng: ${new Date(
                              order.expirationDate
                            ).toLocaleDateString()}`
                          : ""
                      }`}
                    />
                  </ListItem>
                  <Collapse
                    in={expandedOrderId === order._id}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      <Divider />
                      {order.products.map((productItem) => (
                        <ListItem key={productItem._id} sx={{ pl: 2 }}>
                          <ListItemText
                            primary={`${productItem.productId.name} (${productItem.selectedUnitName}) x ${productItem.quantity}`}
                            secondary={`Đơn giá: ${formatCurrency(
                              productItem.unitPrice
                            )} - Tổng cộng: ${formatCurrency(
                              productItem.itemTotal
                            )}`}
                          />
                        </ListItem>
                      ))}
                      <Divider sx={{ mt: 1 }} />
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          mt: 1,
                          pr: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "bold" }}
                        >
                          Tổng tiền: {formatCurrency(order.finalAmount)}
                        </Typography>
                      </Box>
                      {order.expirationDate &&
                        order.orderType === "preorder" && (
                          <Box sx={{ mt: 1, pr: 2 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              align="right"
                            >
                              Hết hạn vào:{" "}
                              {new Date(order.expirationDate).toLocaleString()}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="primary"
                              align="right"
                              sx={{ fontWeight: "bold" }}
                            >
                              Vui lòng đến nhận hàng trước:{" "}
                              {new Date(
                                order.expirationDate
                              ).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                    </List>
                  </Collapse>
                </Paper>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Bạn chưa có đơn hàng nào.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrdersDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLogoutDialog}
        onClose={handleCloseLogoutDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Xác nhận đăng xuất?"}
        </DialogTitle>
        <DialogContent>
          <Typography id="alert-dialog-description">
            Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogoutDialog}>Hủy</Button>
          <Button onClick={handleConfirmLogout} autoFocus>
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box sx={{ flexGrow: 1, height: "70vh", overflow: "hidden" }}>
            <List
              sx={{
                bgcolor: "background.paper",
                height: "100%",
                overflowY: "auto",
                pr: 2,
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
                "&::-webkit-scrollbar-thumb": {
                  background: "#888",
                  borderRadius: "4px",
                },
              }}
            >
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
                          onClick={() =>
                            handleQuantityChange(index, item.quantity - 1)
                          }
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
                            handleQuantityChange(
                              index,
                              parseInt(e.target.value) || 1
                            )
                          }
                          disabled={updating}
                        />

                        <IconButton
                          onClick={() =>
                            handleQuantityChange(index, item.quantity + 1)
                          }
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
                          handleRemoveItem(
                            item.product._id,
                            item.selectedUnitName
                          )
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
          </Box>

          {cart?.items?.length > 0 && (
            <Paper
              sx={{
                p: 3,
                position: "sticky",
                top: 16,
                width: { xs: "100%", md: "350px" },
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Đơn hàng
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="body1">Tạm tính:</Typography>
                <Typography variant="body1">
                  {formatCurrency(cart?.total || 0)}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1">Thành tiền:</Typography>
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  {formatCurrency(cart?.total || 0)}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mb: 2 }}
                onClick={handleCreatePreorder}
                disabled={updating || creatingPreorder || !cart?.items?.length}
              >
                Đặt hàng
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleClearCart}
                disabled={updating || creatingPreorder || !cart?.items?.length}
              >
                Xóa giỏ hàng
              </Button>
            </Paper>
          )}
        </Stack>
      )}
    </Container>
  );
};

export default CartPage;
