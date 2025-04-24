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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UNITS = ["thùng", "bao", "chai", "lọ", "hộp", "gói", "cái", "kg", "liter"];
const STATUSES = [
  { value: "draft", label: "Nháp" },
  { value: "pending", label: "Đang chờ" },
  { value: "approved", label: "Đã duyệt" },
  { value: "partially_received", label: "Nhận một phần" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

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
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [approvalDate, setApprovalDate] = useState(null);
  const [orderStatus, setOrderStatus] = useState("draft");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const token = localStorage.getItem("authToken");

  // gắn xác thực người dùng vào các request axios
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    const getUserInfo = () => {
      try {
        const userInfoString = localStorage.getItem("userInfo");
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
      }
    };

    getUserInfo();
    fetchSuppliers();
    fetchOrders();

    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setTotalPrice(calculateTotal());
  }, [orderItems]);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/suppliers",
        {
          // headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuppliers(response.data);
      // console.log("sup: ", response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/products",
        {
          // headers: { Authorization: `Bearer ${token}` },
        }
      );
      const activeProducts = response.data.data.filter(product => product.active !== false);
      setProducts(activeProducts);
      
      if (selectedSupplier) {
        const supplierData = await axios.get(
          `http://localhost:8000/api/suppliers/${selectedSupplier}`,
          // { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (supplierData.data && supplierData.data.suppliedProducts) {
          const suppliedProductIds = supplierData.data.suppliedProducts.map(
            item => item.product
          );
          
          const filteredProducts = activeProducts.filter(
            product => suppliedProductIds.includes(product._id)
          );
          
          setProducts(filteredProducts);
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    }
  };

  useEffect(() => {
    if (selectedSupplier) {
      fetchProducts();
    }
  }, [selectedSupplier]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/purchaseOrder",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrders(response.data);
      // console.log("Danh sách phiếu đặt hàng:", response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phiếu đặt hàng:", error);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0 || !unit || unitPrice <= 0) {
      alert("Vui lòng nhập đầy đủ thông tin sản phẩm!");
      return;
    }

    const product = products.find((p) => p._id === selectedProduct);
    if (!product) return;

    const existingIndex = orderItems.findIndex(
      (item) => item.product === selectedProduct && item.unit === unit
    );

    if (existingIndex !== -1) {
      setOrderItems(orderItems.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              quantity: item.quantity + Number(quantity),
              totalPrice: (item.quantity + Number(quantity)) * item.unitPrice,
            }
          : item
      ));
    } else {
      setOrderItems([
        ...orderItems,
        {
          product: selectedProduct,
          name: product.name,
          SKU: product.SKU,
          quantity: Number(quantity),
          unit,
          unitPrice: Number(unitPrice),
          totalPrice: Number(quantity) * Number(unitPrice),
        },
      ]);
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
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handlePreviewOrder = () => {
    if (!selectedSupplier) {
      alert("Vui lòng chọn nhà cung cấp!");
      return;
    }

    if (orderItems.length === 0) {
      alert("Vui lòng thêm ít nhất một sản phẩm vào phiếu đặt hàng!");
      return;
    }
    
    // Validate expected delivery date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    
    if (deliveryDate <= currentDate) {
      alert("Ngày giao hàng dự kiến phải sau ngày hiện tại!");
      return;
    }
    
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      alert("Vui lòng chọn nhà cung cấp!");
      return;
    }

    if (orderItems.length === 0) {
      alert("Vui lòng thêm ít nhất một sản phẩm vào phiếu đặt hàng!");
      return;
    }
    
    // Validate expected delivery date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    
    if (deliveryDate <= currentDate) {
      alert("Ngày giao hàng dự kiến phải sau ngày hiện tại!");
      return;
    }

    try {
      // Use totalPrice for consistency
      const payload = {
        supplier: selectedSupplier,
        supplierName: suppliers.find((s) => s._id === selectedSupplier)?.name || "",
        items: orderItems.map(({ product, name, SKU, quantity, unit, unitPrice }) => ({
          product,
          productName: name,
          productSKU: SKU,
          quantity,
          unit,
          unitPrice,
          totalPrice: quantity * unitPrice,
          conversionRate: products.find((p) => p._id === product)?.units.find((u) => u.name === unit)?.ratio || 1,
        })),
        totalAmount: totalPrice, // Use totalPrice directly
        sendEmailFlag: sendEmail,
        expectedDeliveryDate,
        notes,
        deliveryAddress,
        paymentMethod,
        createdBy: (() => {
          try {
            const name = localStorage.getItem("fullName");
            return name || "Không xác định";
          } catch (error) {
            return "Không xác định";
          }
        })(),
        status: orderStatus,
        createdByName: localStorage.getItem("fullName") || "Không xác định",
        orderDate: new Date().toISOString(),
        approvalDate: orderStatus === "approved" ? new Date().toISOString() : null,
      };

      console.log("Dữ liệu gửi đi khi tạo phiếu:", payload);

      const response = await axios.post("http://localhost:8000/api/purchaseOrder", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("Phản hồi khi tạo phiếu:", response.data);
      
      alert("Tạo phiếu đặt hàng thành công!");
      setSelectedSupplier("");
      setOrderItems([]);
      fetchOrders();
    } catch (error) {
      console.error(error);
      // Improved error handling
      if (error.response && error.response.data && error.response.data.error) {
        alert(`Lỗi khi tạo phiếu: ${error.response.data.error}`);
      } else {
        alert("Lỗi khi tạo phiếu đặt hàng!");
      }
    }
  };

  const handleEdit = (order) => {
    console.log("Thông tin phiếu đang chỉnh sửa:", order);
    setEditOrder({
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate.split("T")[0],
      deliveryAddress: order.deliveryAddress || "",
      paymentMethod: order.paymentMethod || "",
      notes: order.notes || "",
      status: order.status || "draft",
      originalStatus: order.status || "draft",
      approvalDate: order.approvalDate || null,
    });
    setEditOrderItems(order.items);
    setOpenDialog(true);
  };

  const handleEditOrderItemChange = (index, field, value) => {
    setEditOrderItems((prevItems) => {
      const updatedItems = [...prevItems];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return updatedItems;
    });
  };

  const handleUpdateOrder = async () => {
    if (new Date(editOrder.expectedDeliveryDate) <= new Date(editOrder.orderDate)) {
      alert("Ngày giao hàng dự kiến phải lớn hơn ngày đặt hàng!");
      return;
    }
    
    try {
      const isNewlyApproved = editOrder.status === "approved" && 
                             (editOrder.originalStatus && editOrder.originalStatus !== "approved");
      
      // Use totalPrice for consistency
      const payload = {
        ...editOrder,
        supplier: editOrder.supplier._id,
        supplierName: suppliers.find((s) => s._id === editOrder.supplier._id)?.name || editOrder.supplierName,
        items: editOrderItems.map(({ product, quantity, unit, unitPrice }) => ({
          product: product._id,
          productName: product.name || "",
          productSKU: product.SKU || "",
          quantity,
          unit,
          unitPrice,
          totalPrice: quantity * unitPrice,
          conversionRate: products.find((p) => p._id === product._id)?.units.find((u) => u.name === unit)?.ratio || 1,
        })),
        approvalDate: isNewlyApproved ? new Date().toISOString() : editOrder.approvalDate,
        totalAmount: editOrderItems.reduce((sum, item) => sum + item.totalPrice, 0), // Use totalPrice for consistency
      };

      // console.log("Dữ liệu gửi đi khi cập nhật phiếu:", payload);

      const response = await axios.put(`http://localhost:8000/api/purchaseOrder/${editOrder._id}`, payload);
      // console.log("Phản hồi khi cập nhật phiếu:", response.data);
      
      alert("Cập nhật phiếu đặt hàng thành công!");
      setOpenDialog(false);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi cập nhật phiếu!");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/purchaseOrder/${id}`);
      alert("Xóa phiếu đặt hàng thành công!");
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi xóa phiếu!");
    }
  };

  const handleResendEmail = async (order) => {
    try {
      await axios.post(`http://localhost:8000/api/purchaseOrder/${order._id}/resend-email`);
      alert("Gửi lại email thành công!");
    } catch (error) {
      console.error("Lỗi khi gửi lại email:", error);
      alert("Lỗi khi gửi lại email!");
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 1200, 
      mx: "auto", 
      p: 4, 
      height: 'calc(100vh - 64px)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Typography variant="h4" mb={4} fontWeight="bold">
        Quản lý phiếu đặt mua hàng
      </Typography>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="h5" mb={2}>
          Tạo phiếu đặt hàng
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Thông tin nhà cung cấp
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Chọn nhà cung cấp</InputLabel>
            <Select
              value={selectedSupplier}
              label="Chọn nhà cung cấp"
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              {suppliers.map((sup) => (
                <MenuItem key={sup._id} value={sup._id}>
                  {sup.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Thông tin sản phẩm
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Sản phẩm</InputLabel>
                <Select
                  value={selectedProduct}
                  label="Sản phẩm"
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name} - {p.SKU} ({p.units[0]?.name || "N/A"})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <TextField
                    label="Số lượng"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth>
                    <InputLabel>Đơn vị</InputLabel>
                    <Select
                      value={unit}
                      label="Đơn vị"
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {products
                        .find((p) => p._id === selectedProduct)?.units.map((u) => (
                          <MenuItem key={u.name} value={u.name}>
                            {u.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Giá nhập"
                    type="number"
                    fullWidth
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label={`Quy đổi (${products.find((p) => p._id === selectedProduct)?.units.find((u) => u.ratio === 1)?.name || "đơn vị nhỏ nhất"})`}
                    type="text"
                    fullWidth
                    value={
                      unit
                        ? `${quantity * (products.find((p) => p._id === selectedProduct)?.units.find((u) => u.name === unit)?.ratio || 1)}`
                        : ""
                    }
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={1}>
              <Button
                variant="contained"
                onClick={handleAddItem}
                sx={{ height: "100%" }}
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
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
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
                  {STATUSES.map((status) => (
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
                      <TableCell>SKU</TableCell>
                      <TableCell>Đơn vị</TableCell>
                      <TableCell>Quy đổi</TableCell>
                      <TableCell>SL</TableCell>
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
                        <TableCell>{item.SKU}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          {products.find((p) => p._id === item.product)?.units.find((u) => u.name === item.unit)?.ratio || "N/A"}
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => updateQuantity(item.product, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          {item.quantity}
                          <IconButton onClick={() => updateQuantity(item.product, 1)}>
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{item.unitPrice.toLocaleString()} đ</TableCell>
                        <TableCell>{item.totalPrice.toLocaleString()} đ</TableCell>
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
                Tổng tiền: {totalPrice.toLocaleString()} đ
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
              <Button variant="contained" onClick={handleSubmit} sx={{ mt: 2 }}>
                Tạo phiếu đặt hàng
              </Button>
            </Box>
          </Paper>
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
                      <strong>Trạng thái:</strong> {
                        STATUSES.find((status) => status.value === orderStatus)?.label || "Nháp"
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      <strong>Người lập đơn:</strong> {
                        (() => {
                          try {
                            const name = localStorage.getItem("fullName");
                            return name || "Không xác định";
                          } catch (error) {
                            return "Không xác định";
                          }
                        })()
                      }
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
                        <TableCell>SKU</TableCell>
                        <TableCell>Đơn vị</TableCell>
                        <TableCell>SL</TableCell>
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
                          <TableCell>{item.SKU}</TableCell>
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
                                          totalPrice: newQuantity * prevItem.unitPrice 
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
                              type="number"
                              size="small"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                setOrderItems(prev => 
                                  prev.map((prevItem, idx) => 
                                    idx === index 
                                      ? { 
                                          ...prevItem, 
                                          unitPrice: newPrice,
                                          totalPrice: prevItem.quantity * newPrice 
                                        } 
                                      : prevItem
                                  )
                                );
                              }}
                              InputProps={{ inputProps: { min: 0 } }}
                            />
                          </TableCell>
                          <TableCell>{item.totalPrice.toLocaleString()} đ</TableCell>
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
                  Tổng tiền: {totalPrice.toLocaleString()} đ
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

        <Typography variant="h5" mb={2}>
          Danh sách phiếu đặt hàng
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã phiếu</TableCell>
                  <TableCell>Nhà cung cấp</TableCell>
                  <TableCell>Ngày đặt hàng</TableCell>
                  <TableCell>Người lập đơn</TableCell>
                  {/* <TableCell>Ngày duyệt đơn</TableCell> */}
                  <TableCell>Ngày giao hàng dự kiến</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>{order._id}</TableCell>
                    <TableCell>{order.supplier.name}</TableCell>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.createdByName || "Không xác định"}
                    </TableCell>
                    {/* <TableCell>
                      {order.approvalDate ? new Date(order.approvalDate).toLocaleDateString() : "Chưa duyệt"}
                    </TableCell> */}
                    <TableCell>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {(order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)).toLocaleString()} đ
                    </TableCell>
                    <TableCell>
                      {STATUSES.find((status) => status.value === order.status)?.label || "Không xác định"}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(order)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(order._id)}>
                        <DeleteIcon />
                      </IconButton>
                      <Button onClick={() => handleResendEmail(order)}>Gửi lại Email</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          fullWidth
          maxWidth="md"
          scroll="paper"
        >
          <DialogTitle>Chỉnh sửa phiếu đặt hàng</DialogTitle>
          <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {editOrder && (
              <Stack spacing={2} mt={2}>
                <FormControl fullWidth>
                  <InputLabel>Nhà cung cấp</InputLabel>
                  <Select
                    value={editOrder.supplier?._id || ""}
                    label="Nhà cung cấp"
                    onChange={(e) => setEditOrder({ 
                      ...editOrder, 
                      supplier: { ...editOrder.supplier, _id: e.target.value }
                    })}
                  >
                    {suppliers.map((sup) => (
                      <MenuItem key={sup._id} value={sup._id}>
                        {sup.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên sản phẩm</TableCell>
                        <TableCell>Đơn vị</TableCell>
                        <TableCell>SL</TableCell>
                        <TableCell>Đơn giá</TableCell>
                        <TableCell>Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editOrderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell>
                            <Select
                              value={item.unit}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "unit", e.target.value)
                              }
                            >
                              {UNITS.map((unit) => (
                                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                              ))}
                            </Select>
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
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "unitPrice", Number(e.target.value))
                              }
                            />
                          </TableCell>
                          <TableCell>{(item.quantity * item.unitPrice).toLocaleString()} đ</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TextField
                  label="Ngày giao hàng dự kiến"
                  type="date"
                  value={editOrder.expectedDeliveryDate}
                  onChange={(e) => setEditOrder({ ...editOrder, expectedDeliveryDate: e.target.value })}
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
                    {STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
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
            <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button onClick={handleUpdateOrder} variant="contained">Cập nhật</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PurchaseOrderManagement;