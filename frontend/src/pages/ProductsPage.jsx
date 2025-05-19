import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  useTheme,
  Chip,
  Stack,
  ImageList,
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Badge,
  Popover,
  ButtonGroup,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useNavigate } from "react-router-dom";

const ProductListPage = () => {
  const [categories, setCategories] = useState([]);
  const [productsWithBatches, setProductsWithBatches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const primaryColor = "#ADD8E6";
  const activeColor = theme.palette.action.selected;
  const hoverColor = theme.palette.action.hover;
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [remainingQuantity, setRemainingQuantity] = useState(0);
  const authToken = localStorage.getItem("authToken");
  const [cartItemCount, setCartItemCount] = useState(0); // State để theo dõi số lượng loại sản phẩm trong giỏ hàng

  const fetchProductsWithBatches = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/products/batch/products-with-batches"
      );
      if (response.data.success) {
        setProductsWithBatches(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching products with batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsWithBatchesByCategory = async (categoryId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/products/batch/products-with-batches?category=${categoryId}`
      );
      if (response.data.success) {
        setProductsWithBatches(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching products with batches by category:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/categories/tree"
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setLoading(true);
    if (category) {
      fetchProductsWithBatchesByCategory(category._id);
    } else {
      fetchProductsWithBatches();
    }
  };

  const handleProductClick = (productId) => {
    const productDetails = productsWithBatches.find(
      (product) => product._id === productId
    );
    setSelectedProductDetails(productDetails);
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setSelectedProductDetails(null);
  };

  const handleGoToCart = () => {
    navigate("/cart_page");
  };

  const calculateTotalRemainingQuantity = (product) => {
    if (!product.batches || product.batches.length === 0) {
      return 0;
    }
    return product.batches.reduce(
      (total, batch) =>
        total +
        ((batch.remaining_quantity || 0) - (batch.reserved_quantity || 0)),
      0
    );
  };

  const handleAddToCartClick = (event, product) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentProduct(product);
    setSelectedQuantity(1);
    setRemainingQuantity(calculateTotalRemainingQuantity(product));
  };

  const fetchCartInfo = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/cart", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.data && response.data.items) {
        setCartItemCount(response.data.items.length); // Đếm số lượng *loại* sản phẩm
      } else {
        setCartItemCount(0);
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin giỏ hàng:", error);
      setCartItemCount(0);
    }
  };

  const handleAddToCartToApi = async (product, quantity, selectedUnitName) => {
    try {
      const response = await axios.post(
        "http://localhost:8000/api/cart/add",
        [
          {
            productId: product._id,
            quantity: quantity,
            selectedUnitName: selectedUnitName,
          },
        ],
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (response.data.message) {
        setSnackbarMessage(response.data.message);
        setSnackbarOpen(true);
        handleCloseQuantityPopover();
        fetchCartInfo(); // Cập nhật số lượng giỏ hàng
      }
      console.log("Đã thêm vào giỏ hàng:", response.data);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      setSnackbarMessage("Có lỗi khi thêm sản phẩm vào giỏ hàng.");
      setSnackbarOpen(true);
    }
  };

  const handleAddToCart = () => {
    if (!currentProduct) return;

    const baseUnit = currentProduct.units.find((unit) => unit.ratio === 1);
    if (!baseUnit) {
      setSnackbarMessage(
        "Không thể thêm sản phẩm: không tìm thấy đơn vị cơ bản"
      );
      setSnackbarOpen(true);
      return;
    }

    if (selectedQuantity > remainingQuantity) {
      setSnackbarMessage(
        `Số lượng bạn chọn (${selectedQuantity}) vượt quá số lượng còn lại (${remainingQuantity})`
      );
      setSnackbarOpen(true);
      return;
    }

    handleAddToCartToApi(currentProduct, selectedQuantity, baseUnit.name);
  };

  const handleCloseQuantityPopover = () => {
    setAnchorEl(null);
    setCurrentProduct(null);
    setRemainingQuantity(0);
  };

  const handleIncrementQuantity = () => {
    if (selectedQuantity < remainingQuantity) {
      setSelectedQuantity((prev) => prev + 1);
    }
  };

  const handleDecrementQuantity = () => {
    setSelectedQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleQuantityChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1 && value <= remainingQuantity) {
      setSelectedQuantity(value);
    } else if (value > remainingQuantity) {
      setSelectedQuantity(remainingQuantity);
      setSnackbarMessage(`Số lượng tối đa có thể thêm là ${remainingQuantity}`);
      setSnackbarOpen(true);
    } else {
      setSelectedQuantity(1);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchProductsWithBatches();
    fetchCartInfo(); // Gọi hàm này khi component mount
  }, []);

  const getBaseUnitPrice = (product) => {
    const baseUnit = product.units.find((unit) => unit.ratio === 1);
    return baseUnit ? baseUnit.salePrice : 0;
  };

  const calculateDiscountedPrice = (product) => {
    if (!product.discount || !product.discount.type) return null;
    const now = new Date();
    if (
      product.discount.startDate &&
      new Date(product.discount.startDate) > now
    )
      return null;
    if (product.discount.endDate && new Date(product.discount.endDate) < now)
      return null;
    const basePrice = getBaseUnitPrice(product);
    return product.discount.type === "percentage"
      ? basePrice * (1 - product.discount.value / 100)
      : Math.max(0, basePrice - product.discount.value);
  };

  const renderPrice = (product) => {
    const basePrice = getBaseUnitPrice(product);
    const discountedPrice = calculateDiscountedPrice(product);

    return (
      <Box>
        {discountedPrice ? (
          <>
            <Typography
              variant="h6"
              color={theme.palette.error.main}
              sx={{ textDecoration: "line-through", fontSize: "0.9rem" }}
            >
              {basePrice.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
            <Typography
              variant="h6"
              color={theme.palette.success.main}
              sx={{ fontWeight: "bold" }}
            >
              {discountedPrice.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
          </>
        ) : (
          <Typography
            variant="h6"
            color={theme.palette.success.main}
            sx={{ fontWeight: "bold" }}
          >
            {basePrice.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Typography>
        )}
      </Box>
    );
  };

  const renderCategories = (categoryList, level = 0) => {
    const marginLeft = level * 16;
    return categoryList.map((category) => (
      <React.Fragment key={category._id}>
        <ListItem disablePadding style={{ marginLeft }}>
          <ListItemButton
            onClick={() => handleCategoryClick(category)}
            sx={{
              backgroundColor:
                selectedCategory?._id === category._id
                  ? activeColor
                  : "transparent",
              "&:hover": { backgroundColor: hoverColor },
            }}
          >
            <ListItemText
              primary={category.name}
              primaryTypographyProps={{
                style: { fontWeight: level === 0 ? "bold" : "normal" },
              }}
            />
          </ListItemButton>
        </ListItem>
        {category.subcategories &&
          renderCategories(category.subcategories, level + 1)}
      </React.Fragment>
    ));
  };

  const filteredProductsWithBatches = productsWithBatches.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ display: "flex", bgcolor: theme.palette.background.default }}>
      <Box
        sx={{
          width: 250,
          minWidth: 250,
          maxWidth: 250,
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: primaryColor,
          overflowY: "auto",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: "center",
            py: 2,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          Danh mục sản phẩm
        </Typography>
        <List sx={{ flexGrow: 1 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleCategoryClick(null)}
              sx={{
                backgroundColor: !selectedCategory
                  ? activeColor
                  : "transparent",
                "&:hover": { backgroundColor: hoverColor },
              }}
            >
              <ListItemText primary="Tất cả sản phẩm" />
            </ListItemButton>
          </ListItem>
          {renderCategories(categories)}
        </List>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            label="Tìm kiếm sản phẩm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: "70%" }}
          />
          <Box>
            <IconButton color="primary" onClick={handleGoToCart}>
              <Badge
                badgeContent={cartItemCount > 0 ? cartItemCount : null}
                color="error"
              >
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
            <IconButton color="primary">
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {filteredProductsWithBatches.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
              <Card sx={{ height: "100%", boxShadow: 2 }}>
                {product.images?.length > 0 ? (
                  <ImageList cols={1} rowHeight={180}>
                    <ImageListItem>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{ objectFit: "contain", height: 180 }}
                      />
                    </ImageListItem>
                  </ImageList>
                ) : (
                  <CardMedia
                    component="img"
                    height="180"
                    image="https://via.placeholder.com/200"
                    alt={product.name}
                    sx={{ objectFit: "contain" }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6">
                    {product.name}
                  </Typography>
                  {product.category && (
                    <Chip
                      label={product.category.name}
                      color="secondary"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {product.description?.substring(0, 100)}...
                  </Typography>
                  {renderPrice(product)}
                  <Typography variant="caption" color="text.secondary">
                    Đơn vị: {product.units.find((u) => u.ratio === 1)?.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: "bold", mt: 1 }}
                  >
                    Số lượng còn lại: {calculateTotalRemainingQuantity(product)}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={(e) => handleAddToCartClick(e, product)}
                      sx={{ flexGrow: 1 }}
                    >
                      Thêm
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleProductClick(product._id)}
                    >
                      Chi tiết
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseQuantityPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: 250,
          }}
        >
          <Typography variant="subtitle1">Chọn số lượng</Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-spaceBetween",
            }}
          >
            <ButtonGroup>
              <Button size="small" onClick={handleDecrementQuantity}>
                <RemoveIcon fontSize="small" />
              </Button>
              <TextField
                size="small"
                type="number"
                value={selectedQuantity}
                onChange={handleQuantityChange}
                inputProps={{
                  min: 1,
                  max: remainingQuantity,
                  style: { textAlign: "center", width: "50px" },
                }}
              />
              <Button size="small" onClick={handleIncrementQuantity}>
                <AddIcon fontSize="small" />
              </Button>
            </ButtonGroup>
            <Button
              variant="contained"
              onClick={handleAddToCart}
              color="primary"
            >
              Xác nhận
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Số lượng còn lại: {remainingQuantity}
          </Typography>
        </Box>
      </Popover>

      <Dialog
        open={openProductDialog}
        onClose={handleCloseProductDialog}
        fullWidth
        maxWidth="sm"
      >
        {selectedProductDetails && (
          <>
            <DialogTitle>{selectedProductDetails.name}</DialogTitle>
            <DialogContent>
              {selectedProductDetails.images?.length > 0 ? (
                <img
                  src={selectedProductDetails.images[0]}
                  alt={selectedProductDetails.name}
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <CardMedia
                  component="img"
                  height="200"
                  image="https://via.placeholder.com/200"
                  alt={selectedProductDetails.name}
                  sx={{ objectFit: "contain" }}
                />
              )}

              <Typography variant="subtitle1" gutterBottom>
                {renderPrice(selectedProductDetails)}
              </Typography>

              {selectedProductDetails.units?.map((unit, index) => (
                <Typography key={index} variant="body2">
                  {unit.name} ({unit.ratio}):{" "}
                  {unit.salePrice.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Typography>
              ))}

              <Typography
                variant="body2"
                color="success.main"
                sx={{ fontWeight: "bold", mt: 1 }}
              >
                Số lượng còn lại:{" "}
                {calculateTotalRemainingQuantity(selectedProductDetails)}
              </Typography>

              {selectedProductDetails.discount && (
                <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.action.hover }}>
                  <Typography variant="subtitle2">
                    Khuyến mãi: {selectedProductDetails.discount.reason}
                  </Typography>
                  <Typography variant="body2">
                    Giảm {selectedProductDetails.discount.value}{" "}
                    {selectedProductDetails.discount.type === "percentage"
                      ? "%"
                      : "₫"}
                  </Typography>
                  <Typography variant="caption">
                    Từ{" "}
                    {new Date(
                      selectedProductDetails.discount.startDate
                    ).toLocaleDateString()}{" "}
                    đến{" "}
                    {new Date(
                      selectedProductDetails.discount.endDate
                    ).toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              <Typography variant="body2" sx={{ mt: 2 }}>
                {selectedProductDetails.description}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseProductDialog}>Đóng</Button>
              <Button
                onClick={(e) => {
                  handleCloseProductDialog();
                  const baseUnit = selectedProductDetails.units.find(
                    (unit) => unit.ratio === 1
                  );
                  if (baseUnit) {
                    handleAddToCartToApi(
                      selectedProductDetails,
                      1, // Mặc định số lượng là 1 khi thêm từ dialog
                      baseUnit.name
                    );
                  } else {
                    setSnackbarMessage(
                      "Không thể thêm sản phẩm: không tìm thấy đơn vị cơ bản"
                    );
                    setSnackbarOpen(true);
                  }
                }}
                color="primary"
                variant="contained"
              >
                Thêm vào giỏ
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductListPage;
