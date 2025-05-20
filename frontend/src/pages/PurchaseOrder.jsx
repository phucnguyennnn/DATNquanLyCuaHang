import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Checkbox,
  Paper,
  Stack,
  useMediaQuery,
  useTheme,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TableSortLabel,
  Autocomplete,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';

const UNITS = ["thùng", "bao", "chai", "lọ", "lon", "hộp", "gói", "cái", "kg", "liter","thùng 30", "thùng 24", "thùng 12", "lốc 6", "bao 10", "bao 15", "bao 20", "bao 5", "lốc 12"];
const STATUSES = [
  { value: "đã gửi NCC", label: "Đã gửi NCC" },
  // { value: "hoàn thành", label: "Hoàn thành" },
  { value: "đã hủy", label: "Đã hủy" },
  { value: "completed", label: "Hoàn thành" },


];

// Custom styled tabs to match sales page
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
    height: 3,
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(16),
  marginRight: theme.spacing(1),
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium,
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(100, 95, 228, 0.32)',
  },
}));

const PurchaseOrderManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [orderItems, setOrderItems] = useState([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [orders, setOrders] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryDateError, setDeliveryDateError] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("Tại cửa hàng");
  const [paymentMethod, setPaymentMethod] = useState("Thanh toán khi nhận hàng");
  const [showPreview, setShowPreview] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [approvalDate, setApprovalDate] = useState(null);
  const [orderStatus, setOrderStatus] = useState("đã gửi NCC");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Thời gian lọc theo ngày giao dự kiến, mặc định từ ngày đầu đến ngày cuối tháng hiện tại
  const [expectedStartDate, setExpectedStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to first day of current month
    return d;
  });
  const [expectedEndDate, setExpectedEndDate] = useState(() => {
    const d = new Date();
    // Set to last day of current month
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedSupplier]);

  useEffect(() => {
    setTotalPrice(orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0));
  }, [orderItems]);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/products");
      const activeProducts = response.data.data.filter(product => product.active !== false);
      if (selectedSupplier) {
        const supplierData = await axios.get(`http://localhost:8000/api/suppliers/${selectedSupplier}`);
        const suppliedProductIds = supplierData.data.suppliedProducts.map(item => item.product);
        const filteredProducts = activeProducts.filter(product => suppliedProductIds.includes(product._id));
        setProducts(filteredProducts);
      } else {
        setProducts(activeProducts);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/purchaseOrder");
      setOrders(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddItem = () => {
    const product = products.find((p) => p._id === selectedProduct);
    if (!product || !selectedProduct || quantity <= 0 || !unit) return; // Removed unitPrice validation
    const existingIndex = orderItems.findIndex(item => item.product === selectedProduct && item.unit === unit);
    if (existingIndex !== -1) {
      setOrderItems(orderItems.map((item, index) => 
        index === existingIndex ? {
          ...item,
          quantity: item.quantity + Number(quantity),
          totalPrice: (item.quantity + Number(quantity)) * (item.unitPrice || 0),
        } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        product: selectedProduct,
        name: product.name,
        quantity: Number(quantity),
        unit,
        unitPrice: unitPrice || 0, // Allow zero or empty price
        totalPrice: Number(quantity) * (unitPrice || 0),
      }]);
    }
    setSelectedProduct("");
    setQuantity(1);
    setUnit("");
    setUnitPrice(0);
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.product !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setOrderItems(prev => prev.map(item => {
      if (item.product === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice };
      }
      return item;
    }));
  };

  const handlePreviewOrder = () => {
    if (!selectedSupplier || orderItems.length === 0) {
      if (!selectedSupplier) {
        alert("Vui lòng chọn nhà cung cấp");
      } else if (orderItems.length === 0) {
        alert("Vui lòng thêm sản phẩm vào đơn hàng");
      }
      return;
    }
    
    if (!validateDeliveryDate(expectedDeliveryDate)) {
      return;
    }
    
    setShowPreview(true);
  };

  const validateDeliveryDate = (date) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(date);
    
    if (deliveryDate < currentDate) {
      setDeliveryDateError("Ngày giao hàng dự kiến phải bằng hoặc sau ngày hiện tại");
      return false;
    }
    
    setDeliveryDateError("");
    return true;
  };

  const handleDeliveryDateChange = (e) => {
    const newDate = e.target.value;
    setExpectedDeliveryDate(newDate);
    validateDeliveryDate(newDate);
  };

  const handleSubmit = async () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    
    if (!selectedSupplier || orderItems.length === 0) {
      if (!selectedSupplier) {
        alert("Vui lòng chọn nhà cung cấp");
      } else if (orderItems.length === 0) {
        alert("Vui lòng thêm sản phẩm vào đơn hàng");
      }
      return;
    }
    
    if (!validateDeliveryDate(expectedDeliveryDate)) {
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        supplier: selectedSupplier,
        supplierName: suppliers.find(s => s._id === selectedSupplier)?.name || "",
        items: orderItems.map(({ product, name, quantity, unit, unitPrice }) => ({
          product,
          productName: name,
          quantity,
          unit,
          unitPrice: unitPrice || 0,
          totalPrice: quantity * (unitPrice || 0),
          conversionRate: products.find(p => p._id === product)?.units.find(u => u.name === unit)?.ratio || 1,
        })),
        totalAmount: totalPrice,
        sendEmailFlag: sendEmail,
        expectedDeliveryDate,
        notes,
        deliveryAddress,
        paymentMethod,
        createdBy: localStorage.getItem("fullName") || "Không xác định",
        status: orderStatus,
        createdByName: localStorage.getItem("fullName") || "Không xác định",
        orderDate: new Date().toISOString(),
        approvalDate: orderStatus === "approved" ? new Date().toISOString() : null,
      };
      await axios.post("http://localhost:8000/api/purchaseOrder", payload);
      alert("Tạo phiếu đặt hàng thành công!");
      setSelectedSupplier("");
      setOrderItems([]);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || "Lỗi khi tạo phiếu đặt hàng!");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    // Add "đã hủy" to the list of read-only statuses
    const isReadOnly = ["hoàn thành", "completed", "đã hủy"].includes(order.status);
    setEditOrder({
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate.split("T")[0],
      deliveryAddress: order.deliveryAddress || "",
      paymentMethod: order.paymentMethod || "",
      notes: order.notes || "",
      status: order.status || "draft",
      originalStatus: order.status || "draft",
      approvalDate: order.approvalDate || null,
      isReadOnly, // Add a flag to indicate read-only mode
    });
    setEditOrderItems(order.items);
    setOpenDialog(true);
  };

  const handleEditOrderItemChange = (index, field, value) => {
    setEditOrderItems(prev => {
      const updatedItems = [...prev];
      updatedItems[index] = { 
        ...updatedItems[index], 
        [field]: value,
        totalPrice: field === 'quantity' || field === 'unitPrice' 
          ? (field === 'unitPrice' ? updatedItems[index].quantity * (value || 0) : (value || 0) * (updatedItems[index].unitPrice || 0))
          : updatedItems[index].totalPrice
      };
      return updatedItems;
    });
  };

  const handleUpdateOrder = async () => {
    if (new Date(editOrder.expectedDeliveryDate) <= new Date(editOrder.orderDate)) return;
    try {
      const isNewlyApproved = editOrder.status === "đã gửi NCC" && editOrder.originalStatus !== "đã gửi NCC";
      const payload = {
        ...editOrder,
        supplier: editOrder.supplier._id,
        supplierName: suppliers.find(s => s._id === editOrder.supplier._id)?.name || editOrder.supplierName,
        items: editOrderItems.map(({ product, quantity, unit, unitPrice }) => ({
          product: product._id,
          productName: product.name || "",
          quantity,
          unit,
          unitPrice: unitPrice || 0,
          totalPrice: quantity * (unitPrice || 0),
          conversionRate: products.find(p => p._id === product._id)?.units.find(u => u.name === unit)?.ratio || 1,
        })),
        approvalDate: isNewlyApproved ? new Date().toISOString() : editOrder.approvalDate,
        totalAmount: editOrderItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0),
      };
      await axios.put(`http://localhost:8000/api/purchaseOrder/${editOrder._id}`, payload);
      alert("Cập nhật phiếu đặt hàng thành công!");
      setOpenDialog(false);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi cập nhật phiếu!");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await axios.delete(`http://localhost:8000/api/purchaseOrder/${confirmDeleteId}`);
      alert("Xóa phiếu đặt hàng thành công!");
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa phiếu!");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleResendEmail = async (order) => {
    try {
      await axios.post(`http://localhost:8000/api/purchaseOrder/${order._id}/resend-email`);
      alert("Gửi lại email thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi gửi lại email!");
    }
  };

  const getFilteredAndSortedOrders = () => {
    return orders
      .filter(order => {
        const matchesSearch = (
          order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.createdByName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        // Lọc theo ngày giao dự kiến
        const orderDate = new Date(order.expectedDeliveryDate);
        const matchesDate =
          (!expectedStartDate || orderDate >= new Date(expectedStartDate.setHours(0,0,0,0))) &&
          (!expectedEndDate || orderDate <= new Date(expectedEndDate.setHours(23,59,59,999)));
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const modifier = sortOrder === "asc" ? 1 : -1;
        switch (sortBy) {
          case "orderDate":
            return (new Date(a.orderDate) - new Date(b.orderDate)) * modifier;
          case "expectedDeliveryDate":
            return (new Date(a.expectedDeliveryDate) - new Date(b.expectedDeliveryDate)) * modifier;
          case "totalAmount":
            return (a.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - 
                   b.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)) * modifier;
          case "status":
            return a.status.localeCompare(b.status) * modifier;
          default:
            return 0;
        }
      });
  };

  const handleSort = (column) => {
    setSortBy(prev => column === prev ? prev : column);
    setSortOrder(prev => column === sortBy ? (prev === "asc" ? "desc" : "asc") : "asc");
  };

  const formatPrice = (value) => {
    if (value === undefined || value === null || value === 0) return "";
    return value.toLocaleString("vi-VN") + " đ";
  };

  const handleUnitPriceChange = (value) => {
    const numericValue = value.replace(/\./g, ""); // Remove existing thousand separators
    setUnitPrice(Number(numericValue));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "success";
      case "đã gửi NCC": return "warning";
      case "đã hủy": return "error";
      case "hoàn thành": return "success";
      default: return "default";
    }
  };
  
  const getStatusText = (status) => {
    return STATUSES.find(s => s.value === status)?.label || status;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
    <Box sx={{ 
      maxWidth: 1400, 
      mx: "auto", 
      height: 'calc(100vh - 64px)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* <Typography variant="h4" mb={3} fontWeight="bold" textAlign="center" color="primary.main">
        Quản lý phiếu đặt hàng
      </Typography> */}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <StyledTabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="purchase order tabs"
        >
          <StyledTab 
            icon={<NoteAddIcon />} 
            iconPosition="start" 
            label="Tạo phiếu đặt hàng" 
          />
          <StyledTab 
            icon={<ListAltIcon />} 
            iconPosition="start" 
            label="Danh sách phiếu đặt hàng" 
          />
        </StyledTabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Tab 1: Create Purchase Order */}
        {tabValue === 0 && (
          <>
            <Typography variant="h5" mb={2}>
              Tạo phiếu đặt hàng
            </Typography>
            
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Thông tin nhà cung cấp
              </Typography>
              <FormControl fullWidth>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ""}
                  value={suppliers.find(sup => sup._id === selectedSupplier) || null}
                  onChange={(event, newValue) => {
                    setSelectedSupplier(newValue ? newValue._id : "");
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Chọn nhà cung cấp" />
                  )}
                />
              </FormControl>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Thông tin sản phẩm
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Autocomplete
                    options={products}
                    getOptionLabel={(option) => `${option.name} - (${option.units[0]?.name || "N/A"})`}
                    value={products.find(p => p._id === selectedProduct) || null}
                    onChange={(event, newValue) => {
                      setSelectedProduct(newValue ? newValue._id : "");
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Sản phẩm" />
                    )}
                  />
                </Grid>
                
                <Grid item xs={6} sm={3} md={2}>
                  <TextField
                    label="Số lượng"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Đơn vị</InputLabel>
                    <Select
                      value={unit}
                      label="Đơn vị"
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {products.find(p => p._id === selectedProduct)?.units.map(u => (
                        <MenuItem key={u.name} value={u.name}>{u.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={8} sm={4} md={2}>
                  <TextField
                    label="Giá nhập (VNĐ)"
                    type="text"
                    fullWidth
                    value={unitPrice === 0 ? "" : unitPrice.toLocaleString("vi-VN")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setUnitPrice(value ? parseInt(value, 10) : 0);
                    }}
                    InputProps={{
                      endAdornment: <Typography variant="caption" color="text.secondary">VNĐ</Typography>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={4} sm={2} md={1}>
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    sx={{ height: "100%", width: "100%" }}
                  >
                    <AddIcon />
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Thông tin giao hàng
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Địa chỉ giao hàng"
                    fullWidth
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Ghi chú"
                    fullWidth
                    multiline
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Ngày giao hàng dự kiến"
                    type="date"
                    fullWidth
                    value={expectedDeliveryDate}
                    onChange={handleDeliveryDateChange}
                    InputLabelProps={{ shrink: true }}
                    error={!!deliveryDateError}
                    helperText={deliveryDateError}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    label="Phương thức thanh toán"
                    fullWidth
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái phiếu</InputLabel>
                    <Select
                      value={orderStatus}
                      label="Trạng thái phiếu"
                      onChange={(e) => setOrderStatus(e.target.value)}
                    >
                      {STATUSES.map(status => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {orderItems.length > 0 && !showPreview && (
              <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Danh sách sản phẩm đã chọn
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={handlePreviewOrder}
                    startIcon={<VisibilityIcon />}
                  >
                    Xem trước phiếu
                  </Button>
                </Box>
                
                <Box sx={{ overflowX: "auto" }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell width="50px">STT</TableCell>
                          <TableCell>Tên sản phẩm</TableCell>
                          <TableCell sx={{ width: '100px' }}>Đơn vị</TableCell>
                          <TableCell sx={{ width: '100px' }}>Số lượng</TableCell>
                          <TableCell>Giá nhập</TableCell>
                          <TableCell>Thành tiền</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                  setOrderItems(prev => 
                                    prev.map((prevItem, idx) => 
                                      idx === index 
                                        ? { 
                                            ...prevItem, 
                                            quantity: newQuantity,
                                            totalPrice: newQuantity * (prevItem.unitPrice || 0)
                                          } 
                                        : prevItem
                                    )
                                  );
                                }}
                                InputProps={{ inputProps: { min: 1 } }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="text"
                                value={
                                  item.unitPrice === 0 ||
                                  item.unitPrice === undefined ||
                                  item.unitPrice === ""
                                    ? ""
                                    : item.unitPrice
                                }
                                onChange={(e) => {
                                  // Chỉ cho phép nhập số, cho phép để trống
                                  const value = e.target.value.replace(/\D/g, "");
                                  setOrderItems(prev =>
                                    prev.map((prevItem, idx) =>
                                      idx === index
                                        ? {
                                            ...prevItem,
                                            unitPrice: value === "" ? "" : Number(value),
                                            totalPrice: prevItem.quantity * (value === "" ? 0 : Number(value)),
                                          }
                                        : prevItem
                                    )
                                  );
                                }}
                                placeholder="Nhập giá"
                                size="small"
                                InputProps={{
                                  inputMode: "numeric",
                                  endAdornment: (
                                    <Typography variant="caption" color="text.secondary">
                                      đ
                                    </Typography>
                                  ),
                                }}
                              />
                            </TableCell>
                            <TableCell>{formatPrice(item.quantity * (item.unitPrice || 0))}</TableCell>
                            <TableCell>
                              <IconButton onClick={() => handleRemoveItem(item.product)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                <Box mt={2}>
                  <Typography variant="h6">
                    Tổng tiền: {formatPrice(totalPrice)}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                      />
                    }
                    label="Gửi email cho nhà cung cấp"
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    sx={{ mt: 2 }}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {loading ? "Đang tạo phiếu..." : "Tạo phiếu đặt hàng"}
                  </Button>
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* Tab 2: Purchase Order List */}
        {tabValue === 1 && (
          <>
            <Typography variant="h5" mb={2}>
              Danh sách phiếu đặt hàng
            </Typography>
            
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Tìm kiếm phiếu đặt hàng"
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Lọc theo trạng thái</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Lọc theo trạng thái"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {STATUSES.map(status => (
                        <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <DatePicker
                      label="Từ ngày dự kiến"
                      value={expectedStartDate}
                      onChange={setExpectedStartDate}
                      format="dd/MM/yyyy"
                      slotProps={{ textField: { fullWidth: true, size: "small" } }}
                      maxDate={expectedEndDate}
                    />
                    <DatePicker
                      label="Đến ngày dự kiến"
                      value={expectedEndDate}
                      onChange={setExpectedEndDate}
                      format="dd/MM/yyyy"
                      slotProps={{ textField: { fullWidth: true, size: "small" } }}
                      minDate={expectedStartDate}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ maxWidth: 90, width: 90, minWidth: 60 }}>
                        <TableSortLabel
                          active={sortBy === "_id"}
                          direction={sortOrder}
                          onClick={() => handleSort("_id")}
                        >
                          Mã phiếu
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "supplier"}
                          direction={sortOrder}
                          onClick={() => handleSort("supplier")}
                        >
                          Nhà cung cấp
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "orderDate"}
                          direction={sortOrder}
                          onClick={() => handleSort("orderDate")}
                        >
                          Ngày đặt hàng
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Người lập đơn</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "expectedDeliveryDate"}
                          direction={sortOrder}
                          onClick={() => handleSort("expectedDeliveryDate")}
                        >
                          Ngày giao dự kiến
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ minWidth: 120, maxWidth: 150, width: 130 }}>
                        <TableSortLabel
                          active={sortBy === "totalAmount"}
                          direction={sortOrder}
                          onClick={() => handleSort("totalAmount")}
                        >
                          Tổng tiền
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "status"}
                          direction={sortOrder}
                          onClick={() => handleSort("status")}
                        >
                          Trạng thái
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        Hành động
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredAndSortedOrders().map((order) => (
                      <TableRow key={order._id}>
                        <TableCell>{order._id}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{order.createdByName || "Không xác định"}</TableCell>
                        <TableCell>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Typography fontWeight="bold">
                            {formatPrice(order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {["hoàn thành", "completed", "đã hủy"].includes(order.status) ? (
                            <IconButton onClick={() => handleEdit(order)}>
                              <VisibilityIcon />
                            </IconButton>
                          ) : (
                            <>
                              <IconButton onClick={() => handleEdit(order)}>
                                <EditIcon />
                              </IconButton>
                              <IconButton onClick={() => handleDelete(order._id)}>
                                <DeleteIcon />
                              </IconButton>
                              <Button onClick={() => handleResendEmail(order)}>Gửi lại Email</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            {/* Confirm Delete Dialog */}
            <Dialog
              open={!!confirmDeleteId}
              onClose={() => setConfirmDeleteId(null)}
            >
              <DialogTitle>Xác nhận xóa phiếu đặt hàng</DialogTitle>
              <DialogContent>
                <Typography>Bạn có chắc chắn muốn xóa phiếu đặt hàng này không?</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmDeleteId(null)}>Hủy</Button>
                <Button onClick={confirmDelete} color="error" variant="contained">Xóa</Button>
              </DialogActions>
            </Dialog>
          </>
        )}

        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          fullWidth
          maxWidth="md"
          scroll="paper"
        >
          <DialogTitle>Xem trước phiếu đặt hàng</DialogTitle>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>Thông tin chung</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Nhà cung cấp:</strong> {suppliers.find(s => s._id === selectedSupplier)?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Ngày đặt hàng:</strong> {new Date().toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Ngày giao hàng dự kiến:</strong> {new Date(expectedDeliveryDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Phương thức thanh toán:</strong> {paymentMethod || "Chưa có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      <strong>Địa chỉ giao hàng:</strong> {deliveryAddress || "Chưa có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      <strong>Ghi chú:</strong> {notes || "Không có"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Trạng thái:</strong>{" "}
                      <Chip
                        label={getStatusText(orderStatus)}
                        color={getStatusColor(orderStatus)}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Người lập đơn:</strong> {localStorage.getItem("fullName") || "Không xác định"}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom>Danh sách sản phẩm</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>STT</TableCell>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell>Đơn vị</TableCell>
                        <TableCell>Số lượng</TableCell>
                        <TableCell>Giá nhập</TableCell>
                        <TableCell>Thành tiền</TableCell>
                        <TableCell>Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                setOrderItems(prev => 
                                  prev.map((prevItem, idx) => 
                                    idx === index 
                                      ? { 
                                          ...prevItem, 
                                          quantity: newQuantity,
                                          totalPrice: newQuantity * (prevItem.unitPrice || 0)
                                        } 
                                      : prevItem
                                  )
                                );
                              }}
                              InputProps={{ inputProps: { min: 1 } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="text"
                              value={
                                item.unitPrice === 0 ||
                                item.unitPrice === undefined ||
                                item.unitPrice === ""
                                  ? ""
                                  : item.unitPrice
                              }
                              onChange={(e) => {
                                // Chỉ cho phép nhập số, cho phép để trống
                                const value = e.target.value.replace(/\D/g, "");
                                setOrderItems(prev =>
                                  prev.map((prevItem, idx) =>
                                    idx === index
                                      ? {
                                            ...prevItem,
                                            unitPrice: value === "" ? "" : Number(value),
                                            totalPrice: prevItem.quantity * (value === "" ? 0 : Number(value)),
                                          }
                                        : prevItem
                                    )
                                  );
                              }}
                              placeholder="Nhập giá"
                              size="small"
                              InputProps={{
                                inputMode: "numeric",
                                endAdornment: (
                                  <Typography variant="caption" color="text.secondary">
                                    đ
                                  </Typography>
                                ),
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatPrice(item.quantity * (item.unitPrice || 0))}</TableCell>
                          <TableCell>
                            <IconButton 
                              color="error" 
                              onClick={() => handleRemoveItem(item.product)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Tổng tiền: {formatPrice(totalPrice)}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                  }
                  label="Gửi email cho nhà cung cấp"
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPreview(false)}>Quay lại chỉnh sửa</Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit}
            >
              Xác nhận tạo phiếu
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md" scroll="paper">
          <DialogTitle>Chỉnh sửa phiếu đặt hàng</DialogTitle>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {editOrder && (
              <Stack spacing={2} mt={2}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ""}
                  value={suppliers.find(sup => sup._id === (editOrder.supplier?._id || "")) || null}
                  onChange={(event, newValue) => {
                    setEditOrder({ 
                      ...editOrder, 
                      supplier: { ...editOrder.supplier, _id: newValue ? newValue._id : "" }
                    });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Nhà cung cấp" />
                  )}
                />

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell sx={{ width: '150px' }}>Đơn vị</TableCell>
                        <TableCell sx={{ width: '100px' }}>Số lượng</TableCell>
                        <TableCell>Đơn giá</TableCell>
                        <TableCell>Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editOrderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell>
                            <Autocomplete
                              options={UNITS}
                              value={item.unit}
                              onChange={(event, newValue) => 
                                handleEditOrderItemChange(index, "unit", newValue)
                              }
                              renderInput={(params) => (
                                <TextField {...params} label="Đơn vị" size="small" />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "quantity", Number(e.target.value))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="text"
                              value={
                                item.unitPrice === 0 ||
                                item.unitPrice === undefined ||
                                item.unitPrice === ""
                                  ? ""
                                  : item.unitPrice
                              }
                              onChange={(e) => {
                                // Chỉ cho phép nhập số, cho phép để trống
                                const value = e.target.value.replace(/\D/g, "");
                                handleEditOrderItemChange(index, "unitPrice", value === "" ? "" : Number(value));
                              }}
                              placeholder="Nhập giá"
                              size="small"
                              InputProps={{
                                inputMode: "numeric",
                                endAdornment: (
                                  <Typography variant="caption" color="text.secondary">
                                    đ
                                  </Typography>
                                ),
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatPrice(item.quantity * item.unitPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TextField
                  label="Ngày giao hàng dự kiến"
                  type="date"
                  value={editOrder.expectedDeliveryDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setEditOrder({ ...editOrder, expectedDeliveryDate: newDate });
                    
                    // Validate the date when editing
                    const currentDate = new Date();
                    currentDate.setHours(0, 0, 0, 0);
                    const deliveryDate = new Date(newDate);
                    

                  }}
                  fullWidth
                />

                <TextField
                  label="Địa chỉ giao hàng"
                  value={editOrder.deliveryAddress}
                  onChange={(e) => setEditOrder({ ...editOrder, deliveryAddress: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Phương thức thanh toán"
                  value={editOrder.paymentMethod}
                  onChange={(e) => setEditOrder({ ...editOrder, paymentMethod: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Ghi chú"
                  multiline
                  rows={4}
                  value={editOrder.notes}
                  onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={editOrder.status}
                    label="Trạng thái"
                    onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value })}
                  >
                    {STATUSES.map(status => (
                      <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Ngày lập đơn"
                      value={new Date(editOrder.orderDate).toLocaleDateString()}
                      InputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Grid>
                  {editOrder.status === "approved" && (
                    <Grid item xs={6}>
                      <TextField
                        label="Ngày duyệt đơn"
                        value={editOrder.approvalDate ? new Date(editOrder.approvalDate).toLocaleDateString() : "Chưa duyệt"}
                        InputProps={{ readOnly: true }}
                        fullWidth
                      />
                    </Grid>
                  )}
                </Grid>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Đóng</Button>
            {!editOrder?.isReadOnly && (
              <Button onClick={handleUpdateOrder} variant="contained">
                Cập nhật
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
    </LocalizationProvider>
  );
};

export default PurchaseOrderManagement;