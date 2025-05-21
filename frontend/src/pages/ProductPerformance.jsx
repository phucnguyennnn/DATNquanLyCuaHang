import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  useTheme,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown } from "@mui/icons-material";

const COLORS = ["#1976d2", "#43a047", "#e53935", "#fbc02d", "#8e24aa", "#0097a7", "#ff5722", "#607d8b", "#9c27b0"];

const formatCurrency = (value) =>
  value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) || "0 ₫";

const ProductPerformance = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filterType, setFilterType] = useState("month");
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterStart, setFilterStart] = useState(null);
  const [filterEnd, setFilterEnd] = useState(null);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);

  // Lấy token từ localStorage
  const token = localStorage.getItem("authToken");

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const config = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {};

        console.log("Fetching orders and products data...");
        
        // Lấy dữ liệu hóa đơn bán hàng
        const orderRes = await axios.get("http://localhost:8000/api/orders", config);
        console.log("Orders response:", orderRes.data);
        
        // Lấy danh sách sản phẩm từ API chính - bổ sung populate
        const productsRes = await axios.get("http://localhost:8000/api/products?populate=category", config);
        console.log("Products response:", productsRes.data);
        
        // Phương pháp dự phòng - lấy thông tin sản phẩm từ order
        let productsFromOrders = [];
        let ordersData = [];
        
        // Xử lý dữ liệu orders
        if (Array.isArray(orderRes.data)) {
          ordersData = orderRes.data;
          // Trích xuất thông tin sản phẩm từ orders
          orderRes.data.forEach(order => {
            if (order.products && Array.isArray(order.products)) {
              productsFromOrders.push(...order.products);
            }
          });
        } else if (orderRes.data && typeof orderRes.data === 'object') {
          // Thử lấy data từ nhiều cấu trúc phản hồi có thể có
          if (Array.isArray(orderRes.data.data)) {
            ordersData = orderRes.data.data;
            // Trích xuất thông tin sản phẩm từ orders
            orderRes.data.data.forEach(order => {
              if (order.products && Array.isArray(order.products)) {
                productsFromOrders.push(...order.products);
              }
            });
          } else if (Array.isArray(orderRes.data.orders)) {
            ordersData = orderRes.data.orders;
            // Trích xuất thông tin sản phẩm từ orders
            orderRes.data.orders.forEach(order => {
              if (order.products && Array.isArray(order.products)) {
                productsFromOrders.push(...order.products);
              }
            });
          }
        }
        
        console.log("Processed orders data:", ordersData);
        setOrders(ordersData);
        
        // Xử lý dữ liệu sản phẩm
        let productsData = [];
        
        // Thử lấy từ API products
        if (productsRes.data && productsRes.data.data && Array.isArray(productsRes.data.data) && productsRes.data.data.length > 0) {
          productsData = productsRes.data.data;
        } 
        // Không có dữ liệu từ API products, sử dụng dữ liệu từ orders
        else if (productsFromOrders.length > 0) {
          // Tạo map để loại bỏ trùng lặp
          const productMap = {};
          productsFromOrders.forEach(product => {
            if (product && product._id) {
              productMap[product._id] = {
                ...product,
                // Nếu product đã có trong map, cộng dồn quantity
                quantity: (productMap[product._id]?.quantity || 0) + (product.quantity || 0)
              };
            }
          });
          
          productsData = Object.values(productMap);
        }
        
        console.log("Processed products data:", productsData);
        setProducts(productsData);
      } catch (e) {
        console.error("Error fetching data:", e);
        setOrders([]);
        setProducts([]);
        
        if (e.response) {
          console.log("Error response:", e.response);
          if (e.response.status === 401) {
            setError("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
          } else {
            setError(`Không thể tải dữ liệu. Lỗi: ${e.response.status} - ${e.response.statusText}`);
          }
        } else if (e.request) {
          setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
        } else {
          setError(`Lỗi không xác định: ${e.message}`);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Filter by time
  const filterByDate = (date) => {
    if (!date) return true;
    let d = new Date(date);
    if (filterType === "month") {
      return (
        d.getMonth() === filterDate.getMonth() &&
        d.getFullYear() === filterDate.getFullYear()
      );
    }
    if (filterType === "day") {
      return (
        d.getDate() === filterDate.getDate() &&
        d.getMonth() === filterDate.getMonth() &&
        d.getFullYear() === filterDate.getFullYear()
      );
    }
    if (filterType === "custom" && filterStart && filterEnd) {
      return d >= filterStart && d <= filterEnd;
    }
    if (filterType === "all") {
      return true;
    }
    return true;
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Tạo mapping giữa product ID và thông tin sản phẩm để dễ tra cứu
  const productMap = useMemo(() => {
    const map = {};
    products.forEach(product => {
      if (product) {
        const productId = product._id || product.id;
        if (productId) {
          map[productId] = product;
        }
      }
    });
    console.log("Product mapping created:", map);
    return map;
  }, [products]);

  // Tính toán dữ liệu thống kê sản phẩm
  const productStats = useMemo(() => {
    if (!orders.length) {
      console.log("No orders data available");
      return null;
    }

    // Lọc đơn hàng theo thời gian và chỉ lấy đơn đã thanh toán
    const filteredOrders = orders.filter(order => {
      const isValidStatus = order.paymentStatus === "paid";
      const isValidDate = filterByDate(order.createdAt);
      return isValidStatus && isValidDate;
    });
    
    console.log("Filtered orders:", filteredOrders);

    // Thống kê dữ liệu theo sản phẩm
    const productSales = {};
    let totalProductsSold = 0;

    filteredOrders.forEach(order => {
      // Kiểm tra cả products hoặc items
      const orderItems = order.products || order.items;
      if (!orderItems || !Array.isArray(orderItems)) {
        console.log("Order without products/items:", order);
        return;
      }
      
      orderItems.forEach(item => {
        // Nhiều định dạng item khác nhau có thể có trong API
        const productId = typeof item.product === 'object' ? 
          item.product?._id || item.product?.id : 
          item._id || item.productId || item.product;
          
        if (!productId) {
          console.log("Item without product ID:", item);
          return;
        }

        // Khởi tạo hoặc cập nhật thông tin sản phẩm
        if (!productSales[productId]) {
          // Ưu tiên lấy thông tin từ productMap trước
          const product = productMap[productId] || {};
          
          // Nếu không có, dùng chính item làm nguồn dữ liệu
          const fallbackProduct = typeof item.product === 'object' ? item.product : item;
          
          let categoryName = "Không phân loại";
          
          // Thử lấy thông tin category từ nhiều nguồn
          if (product.category) {
            if (typeof product.category === 'object') {
              categoryName = product.category.name || categoryName;
            } else if (typeof product.category === 'string') {
              categoryName = product.category;
            }
          } else if (fallbackProduct.category) {
            if (typeof fallbackProduct.category === 'object') {
              categoryName = fallbackProduct.category.name || categoryName;
            } else if (typeof fallbackProduct.category === 'string') {
              categoryName = fallbackProduct.category;
            }
          }
          
          productSales[productId] = {
            id: productId,
            name: product.name || fallbackProduct.name || item.name || 'Sản phẩm không xác định',
            price: product.price || 
                   fallbackProduct.price ||
                   (product.units && product.units.length && product.units[0].salePrice) || 
                   item.price || 
                   item.unitPrice || 
                   0,
            quantity: 0,
            revenue: 0,
            image: product.images?.[0] || fallbackProduct.images?.[0] || '',
            category: categoryName,
          };
          
          console.log(`Created product stat for ${productSales[productId].name}:`, productSales[productId]);
        }

        // Cập nhật số liệu
        const quantity = item.quantity || 0;
        // Xử lý nhiều định dạng giá khác nhau
        const price = item.price || 
                      item.unitPrice || 
                      (item.product && typeof item.product === 'object' && item.product.price) || 
                      productSales[productId].price;
                      
        const subtotal = price * quantity;

        productSales[productId].quantity += quantity;
        productSales[productId].revenue += subtotal;
        totalProductsSold += quantity;
      });
    });

    // Chuyển object thành array để sắp xếp
    const productList = Object.values(productSales);
    console.log("Product statistics generated:", productList);

    // Tính toán thống kê theo danh mục (category)
    const categoryStats = {};
    
    productList.forEach(product => {
      const category = product.category || 'Không phân loại';
      
      if (!categoryStats[category]) {
        categoryStats[category] = {
          name: category,
          quantity: 0, 
          revenue: 0
        };
      }
      
      categoryStats[category].quantity += product.quantity;
      categoryStats[category].revenue += product.revenue;
    });
    
    console.log("Category statistics:", categoryStats);

    return {
      totalProductsSold,
      totalRevenue: productList.reduce((sum, product) => sum + product.revenue, 0),
      productCount: productList.length,
      topSellingByQuantity: [...productList].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      worstSellingByQuantity: [...productList].sort((a, b) => a.quantity - b.quantity).slice(0, 10),
      topSellingByRevenue: [...productList].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      worstSellingByRevenue: [...productList].sort((a, b) => a.revenue - b.revenue).slice(0, 10),
      allProducts: productList,
      categoryStats
    };
  }, [orders, productMap, filterType, filterDate, filterStart, filterEnd]);

  // Dữ liệu cho biểu đồ phân loại
  const categoryChartData = useMemo(() => {
    if (!productStats || !productStats.categoryStats) return [];
    return Object.values(productStats.categoryStats).map((cat, index) => ({
      ...cat,
      fill: COLORS[index % COLORS.length]
    }));
  }, [productStats]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Phân tích hiệu suất sản phẩm
        </Typography>

        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: "#ffebee" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Bộ lọc thời gian */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              select
              label="Khoảng thời gian"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">Tất cả thời gian</MenuItem>
              <MenuItem value="month">Theo tháng</MenuItem>
              <MenuItem value="day">Theo ngày</MenuItem>
              <MenuItem value="custom">Tùy chỉnh</MenuItem>
            </TextField>

            {filterType === "month" && (
              <DatePicker
                label="Chọn tháng"
                views={["year", "month"]}
                value={filterDate}
                onChange={setFilterDate}
                format="MM/yyyy"
              />
            )}

            {filterType === "day" && (
              <DatePicker
                label="Chọn ngày"
                value={filterDate}
                onChange={setFilterDate}
                format="dd/MM/yyyy"
              />
            )}

            {filterType === "custom" && (
              <>
                <DatePicker
                  label="Từ ngày"
                  value={filterStart}
                  onChange={setFilterStart}
                  format="dd/MM/yyyy"
                />
                <DatePicker
                  label="Đến ngày"
                  value={filterEnd}
                  onChange={setFilterEnd}
                  format="dd/MM/yyyy"
                  minDate={filterStart}
                />
              </>
            )}
          </Stack>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : productStats ? (
          <>
            {/* Thống kê tổng quan */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Tổng số sản phẩm đã bán
                    </Typography>
                    <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
                      {productStats.totalProductsSold.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Tổng doanh thu
                    </Typography>
                    <Typography variant="h4" color="success.main" sx={{ mt: 1 }}>
                      {formatCurrency(productStats.totalRevenue)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Số lượng sản phẩm có doanh thu
                    </Typography>
                    <Typography variant="h4" color="info.main" sx={{ mt: 1 }}>
                      {productStats.productCount.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Doanh thu trung bình mỗi sản phẩm
                    </Typography>
                    <Typography variant="h4" color="warning.main" sx={{ mt: 1 }}>
                      {productStats.productCount 
                        ? formatCurrency(productStats.totalRevenue / productStats.productCount) 
                        : formatCurrency(0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs phân tích */}
            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Top sản phẩm bán chạy" />
                <Tab label="Top doanh thu cao" />
                <Tab label="Sản phẩm bán chậm" />
                <Tab label="Phân tích danh mục" />
              </Tabs>
            </Box>

            {/* Tab 0: Top bán chạy về số lượng */}
            {tabValue === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                      Top 10 sản phẩm bán chạy nhất (số lượng)
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={productStats.topSellingByQuantity.map(product => ({
                          name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
                          quantity: product.quantity,
                          revenue: product.revenue
                        }))}
                        margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(value) : value.toLocaleString(),
                            name === 'revenue' ? 'Doanh thu' : 'Số lượng'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="quantity" fill={theme.palette.primary.main} name="Số lượng" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Chi tiết sản phẩm bán chạy
                    </Typography>
                    <TableContainer sx={{ maxHeight: 350 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell align="right">Doanh thu</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productStats.topSellingByQuantity.map((product, idx) => (
                            <TableRow key={product.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {product.image && (
                                    <Avatar 
                                      src={product.image} 
                                      variant="rounded" 
                                      sx={{ width: 30, height: 30, mr: 1 }}
                                    />
                                  )}
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                    {product.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">{product.quantity.toLocaleString()}</TableCell>
                              <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 1: Top sản phẩm doanh thu cao */}
            {tabValue === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                      Top 10 sản phẩm doanh thu cao nhất
                    </Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={productStats.topSellingByRevenue.map(product => ({
                          name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
                          revenue: product.revenue
                        }))}
                        margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="revenue" fill={theme.palette.success.main} name="Doanh thu" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Chi tiết sản phẩm doanh thu cao
                    </Typography>
                    <TableContainer sx={{ maxHeight: 350 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="right">Doanh thu</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productStats.topSellingByRevenue.map((product, idx) => (
                            <TableRow key={product.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {product.image && (
                                    <Avatar 
                                      src={product.image} 
                                      variant="rounded" 
                                      sx={{ width: 30, height: 30, mr: 1 }}
                                    />
                                  )}
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                    {product.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                              <TableCell align="right">{product.quantity.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 2: Sản phẩm bán chậm */}
            {tabValue === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Sản phẩm bán chậm nhất (số lượng)
                    </Typography>
                    <TableContainer sx={{ maxHeight: 350 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell align="right">Doanh thu</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productStats.worstSellingByQuantity.map((product, idx) => (
                            <TableRow key={product.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {product.image && (
                                    <Avatar 
                                      src={product.image} 
                                      variant="rounded" 
                                      sx={{ width: 30, height: 30, mr: 1 }}
                                    />
                                  )}
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                    {product.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <TrendingDown color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                  {product.quantity.toLocaleString()}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Sản phẩm doanh thu thấp nhất
                    </Typography>
                    <TableContainer sx={{ maxHeight: 350 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="right">Doanh thu</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productStats.worstSellingByRevenue.map((product, idx) => (
                            <TableRow key={product.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {product.image && (
                                    <Avatar 
                                      src={product.image} 
                                      variant="rounded" 
                                      sx={{ width: 30, height: 30, mr: 1 }}
                                    />
                                  )}
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                    {product.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <TrendingDown color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                  {formatCurrency(product.revenue)}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{product.quantity.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 3: Phân tích theo danh mục */}
            {tabValue === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: 400 }}>
                    <Typography variant="h6" gutterBottom>
                      Doanh thu theo danh mục
                    </Typography>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="revenue"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: 400 }}>
                    <Typography variant="h6" gutterBottom>
                      Số lượng bán theo danh mục
                    </Typography>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="quantity"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                        <Tooltip formatter={(value) => value.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Chi tiết theo danh mục
                    </Typography>
                    <TableContainer sx={{ maxHeight: 300 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>STT</TableCell>
                            <TableCell>Danh mục</TableCell>
                            <TableCell align="right">Số lượng bán</TableCell>
                            <TableCell align="right">Doanh thu</TableCell>
                            <TableCell align="right">Tỉ lệ doanh thu</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.values(productStats.categoryStats)
                            .sort((a, b) => b.revenue - a.revenue)
                            .map((category, idx) => (
                              <TableRow key={category.name}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                  <Chip 
                                    size="small" 
                                    label={category.name} 
                                    sx={{ bgcolor: COLORS[idx % COLORS.length], color: 'white' }} 
                                  />
                                </TableCell>
                                <TableCell align="right">{category.quantity.toLocaleString()}</TableCell>
                                <TableCell align="right">{formatCurrency(category.revenue)}</TableCell>
                                <TableCell align="right">
                                  {((category.revenue / productStats.totalRevenue) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              Không có dữ liệu sản phẩm để hiển thị
            </Typography>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ProductPerformance;
