import React, { useState, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const formatVND = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState(
    product.units[0]?.name || ""
  );
  const [currentPrice, setCurrentPrice] = useState(
    product.units[0]?.salePrice || 0
  );

  const handleChangeUnit = (event) => {
    const unitName = event.target.value;
    setSelectedUnit(unitName);
    const selectedUnitPrice =
      product.units.find((unit) => unit.name === unitName)?.salePrice || 0;
    setCurrentPrice(selectedUnitPrice);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        height="140"
        image={product.images?.[0]?.url || "https://via.placeholder.com/150"}
        alt={product.name}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div">
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.description}
        </Typography>
        {product.units && product.units.length > 1 && (
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id={`unit-select-label-${product.id}`}>
              Đơn vị
            </InputLabel>
            <Select
              labelId={`unit-select-label-${product.id}`}
              id={`unit-select-${product.id}`}
              value={selectedUnit}
              onChange={handleChangeUnit}
            >
              {product.units.map((unit) => (
                <MenuItem key={unit.name} value={unit.name}>
                  {unit.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="h6">{formatVND(currentPrice)}</Typography>
        {product.batches && product.batches.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {product.batches.length} lô hàng
          </Typography>
        )}
      </CardContent>
      <Box sx={{ p: 2 }}>
        <Button
          size="small"
          color="primary"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          Xem chi tiết
        </Button>
      </Box>
    </Card>
  );
};

const CategoryCard = ({ category }) => (
  <Grid item xs={6} sm={4} md={3} key={category.id}>
    <Card
      sx={{
        borderRadius: useTheme().shape.borderRadius,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          textAlign: "center",
          p: 2,
        }}
      >
        <Typography variant="subtitle1" component="div">
          {category.name}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/api/products/batch/products-with-batches"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data.data);
      } catch (error) {
        console.error("Lỗi khi gọi API sản phẩm: ", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/categories");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Lỗi khi gọi API danh mục: ", error);
      }
    };

    fetchCategories();
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <CssBaseline />
      <Navbar onLogout={handleLogout} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 4,
          overflow: "auto",
          height: "calc(100vh - 64px - 84px)",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              my: 4,
              borderRadius: theme.shape.borderRadius,
              overflow: "hidden",
            }}
          >
            <Card
              sx={{
                position: "relative",
                backgroundColor: theme.palette.primary.light,
                color: "white",
              }}
            >
              <CardMedia
                component="img"
                height="300"
                image="https://source.unsplash.com/random?banner"
                alt="Banner quảng cáo"
                sx={{ opacity: 0.6 }}
              />
              <CardContent
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
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
                  sx={{
                    mt: 2,
                    backgroundColor: theme.palette.primary.main,
                    "&:hover": { backgroundColor: theme.palette.primary.dark },
                  }}
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
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <ProductCard product={product} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ my: 4 }}>
            <Typography variant="h4" gutterBottom>
              Danh mục Nổi bật
            </Typography>
            <Grid container spacing={3}>
              {categories.map((category) => (
                <Grid item xs={6} sm={4} md={3} key={category.id}>
                  <CategoryCard category={category} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box
            sx={{
              my: 4,
              py: 3,
              backgroundColor: theme.palette.grey[100],
              borderRadius: theme.shape.borderRadius,
              p: 3,
            }}
          >
            <Typography variant="h4" gutterBottom>
              Về Chúng Tôi
            </Typography>
            <Typography variant="body1" paragraph>
              Chúng tôi là một cửa hàng bán lẻ trực tuyến hàng đầu, cung cấp đa
              dạng các sản phẩm chất lượng cao để đáp ứng mọi nhu cầu của bạn.
              Với cam kết về dịch vụ khách hàng tuyệt vời và giá cả cạnh tranh,
              chúng tôi luôn nỗ lực mang đến trải nghiệm mua sắm tốt nhất.
            </Typography>
            <Typography variant="body1" paragraph>
              Khám phá bộ sưu tập sản phẩm phong phú của chúng tôi, từ điện tử,
              thời trang đến đồ gia dụng và nhiều hơn nữa. Đội ngũ chuyên gia
              của chúng tôi luôn sẵn sàng hỗ trợ bạn trong quá trình mua sắm.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/about")}
            >
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
