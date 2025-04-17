import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Chip,
  Stack,
  Rating,
  Divider,
  useTheme,
  ImageList,
  ImageListItem,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/products/${id}`);
        if (response.data.success && response.data.data) {
          setProduct(response.data.data);
        } else {
          console.error('Lỗi khi lấy chi tiết sản phẩm:', response.data);
          // Xử lý lỗi (ví dụ: hiển thị thông báo lỗi cho người dùng)
        }
      } catch (error) {
        console.error('Lỗi khi lấy chi tiết sản phẩm:', error);
        // Xử lý lỗi (ví dụ: hiển thị thông báo lỗi cho người dùng)
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) {
    return <Typography sx={{ p: 3 }}>Đang tải chi tiết sản phẩm...</Typography>;
  }

  const handleAddToCart = () => {
    console.log(`Thêm ${product.name} vào giỏ hàng`);
    // Implement logic to add to cart
  };

  const handleAddToWishlist = () => {
    console.log(`Thêm ${product.name} vào yêu thích`);
    // Implement logic to add to wishlist
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.paper, minHeight: '80vh' }}>
      <IconButton onClick={handleGoBack} sx={{ mb: 2 }}>
        <ArrowBackIcon />
      </IconButton>
      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, boxShadow: 3 }}>
        {/* Hình ảnh sản phẩm */}
        <Box sx={{ width: { xs: '100%', md: '40%' }, p: 2 }}>
          {product.images && product.images.length > 0 ? (
            <ImageList cols={1} rowHeight={300}>
              {product.images.map((img, index) => (
                <ImageListItem key={index}>
                  <img
                    src={img}
                    alt={`${product.name} - Hình ${index + 1}`}
                    loading="lazy"
                    style={{ objectFit: 'contain', maxHeight: '300px', width: '100%' }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <CardMedia
              component="img"
              height="300"
              image="https://via.placeholder.com/400"
              alt={product.name}
              sx={{ objectFit: 'contain' }}
            />
          )}
        </Box>

        {/* Thông tin chi tiết sản phẩm */}
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 3 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
              {product.name}
            </Typography>
            {product.category && (
              <Chip label={product.category.name} color="secondary" size="small" sx={{ mb: 1 }} />
            )}
            <Typography variant="subtitle1" gutterBottom color="text.secondary">
              SKU: {product.SKU}
            </Typography>
            <Rating name="read-only" value={4.5} precision={0.5} readOnly sx={{ mb: 2 }} /> {/* Ví dụ rating */}
            <Typography variant="h6" color={theme.palette.success.main} gutterBottom sx={{ fontWeight: 'bold' }}>
              Giá: {product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {product.description}
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddShoppingCartIcon />}
                onClick={handleAddToCart}
                sx={{ flexGrow: 1 }}
              >
                Thêm vào giỏ hàng
              </Button>
              <IconButton aria-label="add to wishlist" onClick={handleAddToWishlist} color="error">
                <FavoriteBorderIcon />
              </IconButton>
            </Stack>
            {product.tags && product.tags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tags:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  {product.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Các thông tin chi tiết khác (có thể mở rộng) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Thông tin chi tiết khác
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">Đơn vị tính: {product.unit}</Typography>
            <Typography variant="body2">SKU: {product.SKU}</Typography>
          </Grid>
          {/* Thêm các thông tin khác bạn muốn hiển thị */}
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductDetail;