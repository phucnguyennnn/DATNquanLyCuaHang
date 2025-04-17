import React from "react";
import {
  Box,
  Container,
  Typography,
  CssBaseline,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  useTheme,
} from "@mui/material";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  const featuredProducts = [
    {
      id: 1,
      name: "Sản phẩm Nổi bật 1",
      image: "https://source.unsplash.com/random?product=1",
      description: "Mô tả ngắn gọn cho Sản phẩm Nổi bật 1.",
      price: 99.99,
    },
    {
      id: 2,
      name: "Sản phẩm Mới 2",
      image: "https://source.unsplash.com/random?product=2",
      description: "Mô tả ngắn gọn cho Sản phẩm Mới 2.",
      price: 149.50,
    },
    {
      id: 3,
      name: "Sản phẩm Bán chạy 3",
      image: "https://source.unsplash.com/random?product=3",
      description: "Mô tả ngắn gọn cho Sản phẩm Bán chạy 3.",
      price: 79.00,
    },
    {
      id: 4,
      name: "Ưu đãi Đặc biệt 4",
      image: "https://source.unsplash.com/random?product=4",
      description: "Mô tả ngắn gọn cho Ưu đãi Đặc biệt 4.",
      price: 199.99,
    },
    {
      id: 5,
      name: "Sản phẩm Thêm 5",
      image: "https://source.unsplash.com/random?product=5",
      description: "Mô tả ngắn gọn cho Sản phẩm Thêm 5.",
      price: 120.00,
    },
    {
      id: 6,
      name: "Sản phẩm Hot 6",
      image: "https://source.unsplash.com/random?product=6",
      description: "Mô tả ngắn gọn cho Sản phẩm Hot 6.",
      price: 55.75,
    },
  ];

  const featuredCategories = [
    { name: "Điện Thoại", image: "https://source.unsplash.com/random?category=phone" },
    { name: "Máy Tính", image: "https://source.unsplash.com/random?category=laptop" },
    { name: "Thời Trang", image: "https://source.unsplash.com/random?category=fashion" },
    { name: "Phụ Kiện", image: "https://source.unsplash.com/random?category=accessories" },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <CssBaseline />
      <Navbar onLogout={handleLogout} />
      
      <Box component="main" sx={{ 
        flexGrow: 1, 
        py: 4,
        overflow: 'auto',
        height: 'calc(100vh - 64px - 84px)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ my: 4, borderRadius: theme.shape.borderRadius, overflow: "hidden" }}>
            <Card sx={{ position: "relative", backgroundColor: theme.palette.primary.light, color: "white" }}>
              <CardMedia
                component="img"
                height="300"
                image="https://source.unsplash.com/random?banner"
                alt="Banner quảng cáo"
                sx={{ opacity: 0.6 }}
              />
              <CardContent sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <Typography variant="h3" gutterBottom>
                  Chào mừng đến với Cửa Hàng Của Chúng Tôi
                </Typography>
                <Typography variant="h5" color="inherit" gutterBottom>
                  Khám phá các sản phẩm mới nhất và ưu đãi độc quyền!
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/products_page")}
                  sx={{ mt: 2, backgroundColor: theme.palette.primary.main, "&:hover": { backgroundColor: theme.palette.primary.dark } }}
                >
                  Mua Sắm Ngay
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h4" gutterBottom>
              Sản phẩm Nổi bật
            </Typography>
            <Grid container spacing={3}>
              {featuredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={product.image}
                      alt={product.name}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div">
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.description}
                      </Typography>
                      <Typography variant="h6">${product.price}</Typography>
                    </CardContent>
                    <Box sx={{ p: 2 }}>
                      <Button size="small" color="primary">
                        Xem chi tiết
                      </Button>
                      <Button size="small" color="secondary" sx={{ ml: 1 }}>
                        Thêm vào giỏ hàng
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h4" gutterBottom>
              Danh mục Nổi bật
            </Typography>
            <Grid container spacing={3}>
              {featuredCategories.map((category) => (
                <Grid item xs={6} sm={4} md={3} key={category.name}>
                  <Card sx={{ position: "relative", borderRadius: theme.shape.borderRadius, overflow: "hidden" }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={category.image}
                      alt={category.name}
                      sx={{ opacity: 0.7 }}
                    />
                    <CardContent sx={{ position: "absolute", bottom: 0, left: 0, width: "100%", backgroundColor: "rgba(0, 0, 0, 0.6)", color: "white", p: 2, textAlign: "center" }}>
                      <Typography variant="subtitle1" component="div">
                        {category.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ my: 4, py: 3, backgroundColor: theme.palette.grey[100], borderRadius: theme.shape.borderRadius, p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Về Chúng Tôi
            </Typography>
            <Typography variant="body1" paragraph>
              Chúng tôi là một cửa hàng bán lẻ trực tuyến hàng đầu, cung cấp đa dạng các sản phẩm chất lượng cao để đáp ứng mọi nhu cầu của bạn. Với cam kết về dịch vụ khách hàng tuyệt vời và giá cả cạnh tranh, chúng tôi luôn nỗ lực mang đến trải nghiệm mua sắm tốt nhất.
            </Typography>
            <Typography variant="body1" paragraph>
              Khám phá bộ sưu tập sản phẩm phong phú của chúng tôi, từ điện tử, thời trang đến đồ gia dụng và nhiều hơn nữa. Đội ngũ chuyên gia của chúng tôi luôn sẵn sàng hỗ trợ bạn trong quá trình mua sắm.
            </Typography>
            <Button variant="outlined" color="primary" onClick={() => navigate("/about")}>
              Tìm Hiểu Thêm
            </Button>
          </Box>
        </Container>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          py: 3,
          backgroundColor: theme.palette.primary.main,
          color: "white",
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body1">
            &copy; {new Date().getFullYear()} ShopnameTest. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Theo dõi chúng tôi trên:
            <Button color="inherit" href="https://facebook.com">
              Facebook
            </Button>
            <Button color="inherit" href="https://twitter.com">
              Twitter
            </Button>
            <Button color="inherit" href="https://instagram.com">
              Instagram
            </Button>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;