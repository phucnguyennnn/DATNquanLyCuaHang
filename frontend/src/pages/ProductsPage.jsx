import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';

const ProductListPage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/categories/tree');
        setCategories(response.data);
      } catch (error) {
        console.error('Lỗi khi lấy danh mục:', error);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/products');
        if (response.data.success) {
          setProducts(response.data.data);
        } else {
          console.error('Lỗi từ API:', response.data);
        }
      } catch (error) {
        console.error('Lỗi khi lấy sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchProducts();
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    axios
      .get(`http://localhost:8000/api/products?category=${category._id}`)
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.data);
        } else {
          console.error('Lỗi từ API (lọc theo danh mục):', res.data);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (product) => {
    console.log(`Thêm ${product.name} vào giỏ hàng`);
  };

  if (loading) {
    return <Typography sx={{ p: 3 }}>Đang tải sản phẩm...</Typography>;
  }

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const renderCategories = (categoryList) => {
    return categoryList.map((category) => (
      <React.Fragment key={category._id}>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleCategoryClick(category)}>
            <ListItemText primary={category.name} />
          </ListItemButton>
        </ListItem>
        {category.subcategories && renderCategories(category.subcategories)}
      </React.Fragment>
    ));
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={{ width: 250, borderRight: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
        <List>{renderCategories(categories)}</List>
      </Box>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            label="Tìm kiếm sản phẩm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: '70%' }}
          />
          <Box>
            <IconButton color="primary">
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
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 2 }}>
                {product.images && product.images.length > 0 ? (
                  <ImageList cols={1} rowHeight={180} sx={{ flexGrow: 1 }}>
                    <ImageListItem>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        loading="lazy"
                        style={{ objectFit: 'contain', maxHeight: '180px', width: '100%' }}
                      />
                    </ImageListItem>
                  </ImageList>
                ) : (
                  <CardMedia
                    component="img"
                    height="180"
                    image="https://via.placeholder.com/200"
                    alt={product.name}
                    sx={{ objectFit: 'contain', flexGrow: 1 }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                      {product.name}
                    </Typography>
                    {product.category && (
                      <Chip label={product.category.name} color="secondary" size="small" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {product.description && product.description.substring(0, 100)}...
                    </Typography>
                    <Typography variant="h6" color={theme.palette.success.main} sx={{ fontWeight: 'bold' }}>
                      {product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
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
                    <Button variant="outlined" onClick={() => handleProductClick(product._id)}>
                      Chi tiết
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductListPage;