import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  TextField,
  List,
  Card,
  CardContent,
  Typography,
  Button,
  ListItem,
  IconButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  OutlinedInput,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  Stack,
  InputLabel,
  CardActions,
  ListItemText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { styled } from "@mui/material/styles";
import axios from "axios";

const ProductCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  width: 200,
  height: "auto",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
  },
}));

const ProductCardContent = styled(CardContent)({
  flexGrow: 1,
  padding: (theme) => theme.spacing(1.5),
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
});

function CreateOrder() {
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [formattedCashReceived, setFormattedCashReceived] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/categories/tree",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok)
          throw new Error(`Failed to fetch categories: ${response.status}`);
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError(error.message);
      }
    };

    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await axios.get(
          "http://localhost:8000/api/user?role=customer",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCustomers(response.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    if (token) {
      fetchCategories();
      fetchCustomers();
    } else {
      setError("Bạn chưa đăng nhập");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("http://localhost:8000/api/products", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Lỗi khi tải sản phẩm: ${response.status} - ${errorData?.message}`
          );
        }
        const data = await response.json();
        setProducts(data.data);
        setFilteredProducts(data.data);
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    token
      ? fetchProducts()
      : (setError("Bạn chưa đăng nhập"), setLoading(false));
  }, [token]);

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    filterProducts(term, selectedCategory);
  };

  const handleCategoryChange = (event) => {
    const categoryName = event.target.value;
    setSelectedCategory(categoryName);
    filterProducts(searchTerm, categoryName);
  };

  const filterProducts = (term, categoryName) => {
    let results = products;
    if (term) {
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(term.toLowerCase())
      );
    }
    if (categoryName !== "Tất cả") {
      results = results.filter(
        (product) => product.category?.name === categoryName
      );
    }
    setFilteredProducts(results);
  };

  const handleAddToCart = (product) => {
    const existingItem = orderItems.find((item) => item._id === product._id);
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const defaultUnit =
        product.units?.find((unit) => unit.ratio === 1) || product.units?.[0];
      defaultUnit &&
        setOrderItems([
          ...orderItems,
          { ...product, quantity: 1, selectedUnit: defaultUnit },
        ]);
    }
  };

  const handleChangeQuantity = (itemId, quantity) => {
    setOrderItems(
      orderItems.map((item) =>
        item._id === itemId && quantity > 0 ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId) => {
    setOrderItems(orderItems.filter((item) => item._id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const salePrice =
        item.selectedUnit?.salePrice || item.units?.[0]?.salePrice || 0;
      return total + salePrice * item.quantity;
    }, 0);
  };

  const handleCashReceivedChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setCashReceived(value);
    setErrorMessage("");
    
    if (value) {
      setFormattedCashReceived(parseInt(value).toLocaleString('vi-VN'));
    } else {
      setFormattedCashReceived("");
    }
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const received = parseFloat(cashReceived) || 0;
    return received - total;
  };

  const handlePayment = async () => {
    if (orderItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào đơn hàng trước khi thanh toán.");
      return;
    }

    if (paymentMethod === "cash" && !cashReceived) {
      setErrorMessage("Vui lòng nhập số tiền khách đưa.");
      return;
    }

    const orderData = {
      customerId: selectedCustomer?._id || null,
      items: orderItems.map((item) => ({
        product: item._id,
        quantity: item.quantity,
        units: item.selectedUnit?.name || item.units?.[0]?.name,
      })),
      paymentMethod: paymentMethod,
      amountPaid:
        paymentMethod === "cash" ? parseFloat(cashReceived) : undefined,
    };

    const token = localStorage.getItem("authToken");

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Lỗi tạo đơn hàng: ${response.status} - ${
            errorData?.message || "Không rõ nguyên nhân"
          }`
        );
      }

      const orderResult = await response.json();
      alert(
        `Thanh toán thành công!\nMã đơn hàng: ${
          orderResult.orderNumber
        }\nTổng tiền: ${orderResult.finalAmount?.toLocaleString("vi-VN")} VNĐ${
          paymentMethod === "cash"
            ? `\nKhách đưa: ${parseFloat(cashReceived).toLocaleString(
                "vi-VN"
              )} VNĐ\nTiền thối: ${(
                (parseFloat(cashReceived) || 0) - (orderResult.finalAmount || 0)
              ).toLocaleString("vi-VN")} VNĐ`
            : ""
        }`
      );

      setOrderItems([]);
      setShowPaymentOptions(false);
      setCashReceived("");
      setErrorMessage("");
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      setError(error.message);
      alert(`Lỗi khi tạo đơn hàng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (itemId, unitName) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item._id === itemId) {
          const selectedUnit = item.units.find(
            (unit) => unit.name === unitName
          );
          return { ...item, selectedUnit: selectedUnit || item.units[0] };
        }
        return item;
      })
    );
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
    setErrorMessage("");
  };

  if (loading) {
    return (
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, height: "100%" }}>
      <Stack direction="row" spacing={3} sx={{ height: "100vh" }}>
        <Box sx={{ flex: 1, height: "100vh" }}>
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
              sx={{ mb: 2 }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="category-select-label">Danh mục</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                label="Danh mục"
                onChange={handleCategoryChange}
              >
                <MenuItem value="Tất cả">Tất cả</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category._id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                paddingBottom: 2,
                margin: -2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  height: "auto",
                  py: 1,
                }}
              >
                {filteredProducts.map((product) => (
                  <Box key={product._id} sx={{ padding: 1, width: 200 }}>
                    <ProductCard>
                      <ProductCardContent>
                        <Typography variant="subtitle1" noWrap>
                          {product.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          Mã: {product.barcode || "N/A"}
                        </Typography>
                        <Typography variant="caption" noWrap>
                          Đơn vị:{" "}
                          {product.units
                            ?.map(
                              (unit) =>
                                `${unit.name} (${unit.salePrice.toLocaleString(
                                  "vi-VN"
                                )})`
                            )
                            .join(", ")}
                        </Typography>
                        {product.images?.length > 0 && (
                          <Box
                            sx={{
                              width: "100%",
                              height: 80,
                              mt: 0.5,
                              overflow: "hidden",
                              borderRadius: "4px",
                            }}
                          >
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </Box>
                        )}
                      </ProductCardContent>
                      <CardActions
                        sx={{ padding: (theme) => theme.spacing(0.5, 1) }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleAddToCart(product)}
                          sx={{ margin: "auto", fontSize: "0.8rem" }}
                        >
                          Thêm
                        </Button>
                      </CardActions>
                    </ProductCard>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Box>

        <Box
          sx={{
            width: 350,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              mb: 2,
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="customer-select-label">Khách hàng</InputLabel>
              <Select
                labelId="customer-select-label"
                value={selectedCustomer?._id || ""}
                label="Khách hàng"
                onChange={(e) => {
                  const customerId = e.target.value;
                  const customer =
                    customers.find((c) => c._id === customerId) || null;
                  setSelectedCustomer(customer);
                }}
                renderValue={(value) => {
                  if (!value) return "Khách vãng lai";
                  const customer = customers.find((c) => c._id === value);
                  return customer
                    ? `${customer.fullName} (${customer.phone})`
                    : "";
                }}
              >
                <MenuItem value="">
                  <em>Khách vãng lai</em>
                </MenuItem>
                {loadingCustomers ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} />
                  </MenuItem>
                ) : (
                  customers?.map((customer) => (
                    <MenuItem key={customer._id} value={customer._id}>
                      {customer.fullName} - {customer.phone}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Typography variant="h6" gutterBottom>
              Đơn hàng
            </Typography>
            <List>
              {orderItems.map((item) => (
                <ListItem
                  key={item._id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={`Giá: ${(
                      item.selectedUnit?.salePrice ||
                      item.units?.[0]?.salePrice ||
                      0
                    ).toLocaleString("vi-VN")} VNĐ / ${
                      item.selectedUnit?.name || item.units?.[0]?.name
                    }`}
                    primaryTypographyProps={{ fontSize: "0.9rem" }}
                    secondaryTypographyProps={{ fontSize: "0.8rem" }}
                  />
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) =>
                        handleChangeQuantity(item._id, parseInt(e.target.value))
                      }
                      inputProps={{ min: 1 }}
                      sx={{ width: 60, mr: 1 }}
                    />
                    {item.units && item.units.length > 1 && (
                      <FormControl size="small" sx={{ mr: 1 }}>
                        <Select
                          value={item.selectedUnit?.name || item.units[0]?.name}
                          onChange={(e) =>
                            handleUnitChange(item._id, e.target.value)
                          }
                          displayEmpty
                          renderValue={(value) => value || item.units[0]?.name}
                          sx={{ fontSize: "0.8rem", height: 30 }}
                        >
                          {item.units.map((unit) => (
                            <MenuItem
                              key={unit.name}
                              value={unit.name}
                              sx={{ fontSize: "0.8rem" }}
                            >
                              {unit.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveItem(item._id)}
                      size="small"
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
              {orderItems.length > 0 && (
                <Typography
                  variant="subtitle1"
                  sx={{ mt: 2, fontWeight: "bold" }}
                >
                    Tổng cộng: {calculateTotal().toLocaleString("vi-VN")} VNĐ
                </Typography>
              )}
            </List>
            {orderItems.length > 0 && (
              <Button
                variant="contained"
                onClick={() => setShowPaymentOptions(true)}
                sx={{ mt: 2 }}
                disabled={loading}
              >
                Thanh toán
              </Button>
            )}
          </Paper>

          {showPaymentOptions && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Chọn phương thức thanh toán
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  aria-label="payment-method"
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={handlePaymentMethodChange}
                >
                  <FormControlLabel
                    value="cash"
                    control={<Radio />}
                    label="Tiền mặt"
                  />
                  {/* Thêm các phương thức thanh toán khác nếu cần */}
                </RadioGroup>
              </FormControl>

              {paymentMethod === "cash" && (
                <TextField
                  label="Số tiền khách đưa"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={formattedCashReceived}
                  onChange={handleCashReceivedChange}
                  sx={{ mb: 1 }}
                  error={!!errorMessage}
                  helperText={errorMessage}
                  InputProps={{
                    endAdornment: <span style={{ marginLeft: 8 }}>VNĐ</span>,
                  }}
                  inputProps={{
                    inputMode: 'numeric',
                  }}
                />
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Xác nhận thanh toán"
                )}
              </Button>
              {paymentMethod === "cash" && cashReceived && (
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Tiền thối: {calculateChange().toLocaleString("vi-VN")} VNĐ
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      </Stack>
    </Container>
  );
}

export default CreateOrder;
