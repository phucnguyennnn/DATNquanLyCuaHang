import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  IconButton,
  Badge,
  CircularProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ShoppingCart,
  Person,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:8000/api/products'),
          fetch('http://localhost:8000/api/categories')
        ]);
        const [productsData, categoriesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter(product => product.category?._id === selectedCategory)
    : products;

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      return existing
        ? prev.map(item =>
            item.product._id === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...prev, { product, quantity: 1 }];
    });
  };

  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f5f5' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 260,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: 260,
            boxSizing: 'border-box',
            marginTop: '64px',
            paddingTop: 2,
            bgcolor: '#ffffff',
            borderRight: '1px solid #e0e0e0'
          }
        }}
      >
        <Typography variant="h6" fontWeight="bold" pl={2} mb={2}>
          <CategoryIcon sx={{ mr: 1 }} />
          Danh mục
        </Typography>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => setSelectedCategory(null)}
              selected={!selectedCategory}
            >
              <ListItemText primary="Tất cả sản phẩm" />
            </ListItemButton>
          </ListItem>
          {categories.map((cat) => (
            <ListItem key={cat._id} disablePadding>
              <ListItemButton
                onClick={() => setSelectedCategory(cat._id)}
                selected={selectedCategory === cat._id}
              >
                <ListItemText primary={cat.category_name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="flex-end" mb={4} gap={2}>
          <Tooltip title="Hồ sơ cá nhân">
            <IconButton onClick={() => navigate('/profile')}>
              <Person fontSize="large" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Giỏ hàng">
            <IconButton onClick={() => navigate('/cart_page')}>
              <Badge badgeContent={totalCartItems} color="error">
                <ShoppingCart fontSize="large" />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Product Grid */}
        <Stack direction="row" flexWrap="wrap" gap={4} justifyContent="flex-start">
          {filteredProducts.map(product => (
            <Card
              key={product._id}
              sx={{
                width: 260,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 4,
                borderRadius: 4,
                overflow: 'hidden',
                bgcolor: '#ffffff',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                }
              }}
            >
              {product.images?.[0] && (
                <CardMedia
                  component="img"
                  image={product.images[0]}
                  alt={product.name}
                  sx={{ height: 200, objectFit: 'contain', p: 2 }}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {product.category?.name || 'Không rõ danh mục'}
                </Typography>
                <Typography variant="h6" color="primary" mt={1}>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(product.price)}
                </Typography>
              </CardContent>
              <Box p={2} pt={0}>
                <Button
                  variant="contained"
                  fullWidth
                  color="primary"
                  onClick={() => handleAddToCart(product)}
                  sx={{ fontWeight: 'bold', borderRadius: 2 }}
                >
                  Thêm vào giỏ
                </Button>
              </Box>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default ProductPage;
