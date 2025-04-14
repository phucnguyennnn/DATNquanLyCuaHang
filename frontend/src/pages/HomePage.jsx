import React from "react";
import {
  Box,
  Container,
  Typography,
  CssBaseline,
  Stack,
  Card,
  CardMedia,
  CardContent,
  Button,
} from "@mui/material";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  // Dữ liệu mẫu cho các sản phẩm nổi bật
  const featuredProducts = [
    {
      id: 1,
      name: "Product 1",
      image: "https://via.placeholder.com/150",
      description: "Description for Product 1",
    },
    {
      id: 2,
      name: "Product 2",
      image: "https://via.placeholder.com/150",
      description: "Description for Product 2",
    },
    {
      id: 3,
      name: "Product 3",
      image: "https://via.placeholder.com/150",
      description: "Description for Product 3",
    },
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <CssBaseline />
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflowY: "auto", // Cho phép scroll nội dung
          p: 3,
        }}
      >
        {/* Navbar */}
        <Navbar onLogout={handleLogout} />

        {/* Nội dung chính */}
        <Container>
          {/* Banner quảng cáo */}
          <Box sx={{ my: 4, textAlign: "center" }}>
            <Typography variant="h3" gutterBottom>
              Welcome to Our Shop
            </Typography>
            <Typography variant="h5" gutterBottom>
              Discover our latest products and exclusive offers
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => navigate("/products")}
            >
              Shop Now
            </Button>
          </Box>

          {/* Danh sách sản phẩm nổi bật */}
          <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
            Featured Products
          </Typography>
          <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap" }}>
            {featuredProducts.map((product) => (
              <Box key={product.id} sx={{ width: "300px", mb: 4 }}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={product.image}
                    alt={product.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Stack>

          {/* Thông tin cửa hàng */}
          <Box sx={{ my: 4 }}>
            <Typography variant="h4" gutterBottom>
              About Us
            </Typography>
            <Typography variant="body1" gutterBottom>
              We are a leading retail store offering a wide range of products to
              meet your needs. Visit us today to explore our collection and
              enjoy exclusive offers.
            </Typography>
            <Typography variant="body1" gutterBottom>
              Address: address test
            </Typography>
            <Typography variant="body1" gutterBottom>
              Phone: phone test
            </Typography>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              mt: 4,
              py: 3,
              backgroundColor: "primary.main",
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography variant="body1">
              &copy; {new Date().getFullYear()} ShopnameTest. All rights
              reserved.
            </Typography>
            <Typography variant="body1">
              Follow us on:
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
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
