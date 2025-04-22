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
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useNavigate } from "react-router-dom";

const ProductListPage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
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
  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/products");
      if (response.data.success) {
        setProducts(response.data.data);
      } else {
        console.error("Lỗi từ API (tất cả sản phẩm):", response.data);
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByCategory = async (categoryId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/products?category=${categoryId}`
      );
      if (response.data.success) {
        setProducts(response.data.data);
      } else {
        console.error("Lỗi từ API (lọc theo danh mục):", response.data);
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/categories/tree"
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh mục:", error);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category) {
      fetchProductsByCategory(category._id);
    } else {
      fetchProducts();
    }
  };

  const handleProductClick = (productId) => {
    const productDetails = products.find(
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
  const handleAddToCart = (product) => {
    console.log(`Thêm ${product.name} vào giỏ hàng`);
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

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
              "&:hover": {
                backgroundColor: hoverColor,
              },
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

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      <Box
        sx={{
          width: 250,
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: primaryColor,
        }}
      >
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleCategoryClick(null)}
              sx={{
                backgroundColor:
                  selectedCategory === null ? activeColor : "transparent",
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemText
                primary="Tất cả sản phẩm"
                primaryTypographyProps={{ fontWeight: "bold" }}
              />
            </ListItemButton>
          </ListItem>
          {renderCategories(categories)}
        </List>
      </Box>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            label="Tìm kiếm sản phẩm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: "70%" }}
          />
          <Box>
            <IconButton color="primary" onClick={handleGoToCart}>
              <ShoppingCartIcon />
            </IconButton>
            <IconButton color="primary">
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Box>
        <Grid container spacing={3}>
          {filteredProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: 2,
                }}
              >
                {product.images && product.images.length > 0 ? (
                  <ImageList cols={1} rowHeight={180} sx={{ flexGrow: 1 }}>
                    <ImageListItem>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          objectFit: "contain",
                          maxHeight: "180px",
                          width: "100%",
                        }}
                      />
                    </ImageListItem>
                  </ImageList>
                ) : (
                  <CardMedia
                    component="img"
                    height="180"
                    image="https://via.placeholder.com/200"
                    alt={product.name}
                    sx={{ objectFit: "contain", flexGrow: 1 }}
                  />
                )}
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      gutterBottom
                      variant="h6"
                      component="div"
                      sx={{ fontWeight: "bold", color: primaryColor }}
                    >
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
                      {product.description &&
                        product.description.substring(0, 100)}
                      ...
                    </Typography>
                    <Typography
                      variant="h6"
                      color={theme.palette.success.main}
                      sx={{ fontWeight: "bold" }}
                    >
                      {product.price.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleAddToCart(product)}
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
              {selectedProductDetails.images &&
              selectedProductDetails.images.length > 0 ? (
                <ImageList cols={1} rowHeight={200} sx={{ mb: 2 }}>
                  <ImageListItem>
                    <img
                      src={selectedProductDetails.images[0]}
                      alt={selectedProductDetails.name}
                      loading="lazy"
                      style={{
                        objectFit: "contain",
                        maxHeight: "200px",
                        width: "100%",
                      }}
                    />
                  </ImageListItem>
                </ImageList>
              ) : (
                <CardMedia
                  component="img"
                  height="200"
                  image="https://via.placeholder.com/200"
                  alt={selectedProductDetails.name}
                  sx={{ objectFit: "contain", mb: 2 }}
                />
              )}
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                Giá:{" "}
                {selectedProductDetails.price?.toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })}
              </Typography>
              {selectedProductDetails.category && (
                <Chip
                  label={selectedProductDetails.category.name}
                  color="secondary"
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              <Typography variant="body1" gutterBottom>
                {selectedProductDetails.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Đơn vị tính: {selectedProductDetails.unit}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                SKU: {selectedProductDetails.SKU}
              </Typography>
              {selectedProductDetails.tags &&
                selectedProductDetails.tags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tags: {selectedProductDetails.tags.join(", ")}
                    </Typography>
                  </Box>
                )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseProductDialog} color="primary">
                Đóng
              </Button>
              <Button
                onClick={() => handleAddToCart(selectedProductDetails)}
                color="primary"
                autoFocus
              >
                Thêm vào giỏ hàng
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ProductListPage;