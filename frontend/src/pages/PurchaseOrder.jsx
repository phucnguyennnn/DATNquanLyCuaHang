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
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UNITS = ["thùng", "bao", "chai", "lọ", "hộp", "gói", "cái", "kg", "liter"];
const STATUSES = ["draft", "pending", "approved", "partially_received", "completed", "cancelled"];

const PurchaseOrderManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [conversionRate, setConversionRate] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [smallestUnit, setSmallestUnit] = useState("");
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    fetchSuppliers();
    fetchOrders();

    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    if (selectedSupplier) fetchProductsBySupplier(selectedSupplier);
    else setProducts([]);
  }, [selectedSupplier]);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProductsBySupplier = async (supplierId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/suppliers/${supplierId}/products`);
      setProducts(response.data.products);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/purchaseOrder");
      setOrders(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phiếu đặt hàng:", error);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0 || !unit || conversionRate <= 0 || !smallestUnit || unitPrice <= 0) {
      alert("Vui lòng nhập đầy đủ thông tin sản phẩm!");
      return;
    }

    const product = products.find((p) => p._id === selectedProduct);
    if (!product) return;

    const existingIndex = orderItems.findIndex((item) => item.product === selectedProduct);

    if (existingIndex !== -1) {
      setOrderItems(orderItems.map((item, index) => 
        index === existingIndex ? {
          ...item,
          quantity: item.quantity + Number(quantity),
          totalPrice: (item.quantity + Number(quantity)) * item.unitPrice
        } : item
      ));
    } else {
      setOrderItems([...orderItems, {
        product: selectedProduct,
        name: product.name,
        quantity: Number(quantity),
        unit,
        conversionRate: Number(conversionRate),
        unitPrice: Number(unitPrice),
        smallestUnit,
        totalPrice: Number(quantity) * Number(unitPrice),
      }]);
    }

    setSelectedProduct("");
    setQuantity(1);
    setUnit("");
    setConversionRate(1);
    setUnitPrice(0);
    setSmallestUnit("");
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

  const handleSubmit = async () => {
    try {
      const payload = {
        supplier: selectedSupplier,
        items: orderItems.map(({ product, quantity, unit, conversionRate, unitPrice, smallestUnit }) => ({
          product,
          quantity,
          unit,
          conversionRate,
          unitPrice,
          smallestUnit,
        })),
        totalAmount: calculateTotal(),
        sendEmailFlag: sendEmail,
        expectedDeliveryDate: expectedDeliveryDate,
        notes: notes,
        deliveryAddress: deliveryAddress,
        paymentMethod: paymentMethod,
      };

      await axios.post("http://localhost:8000/api/purchaseOrder", payload);
      alert("Tạo phiếu đặt hàng thành công!");
      setSelectedSupplier("");
      setOrderItems([]);
      fetchOrders();
    } catch (error) {
      console.error(error);
      alert("Lỗi khi tạo phiếu!");
    }
  };

  const handleEdit = (order) => {
    setEditOrder({
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate.split("T")[0],
      deliveryAddress: order.deliveryAddress || "",
      paymentMethod: order.paymentMethod || "",
      notes: order.notes || "",
      status: order.status || "draft"
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
      const payload = {
        ...editOrder,
        supplier: editOrder.supplier._id,
        items: editOrderItems.map(({ product, quantity, unit, conversionRate, unitPrice, smallestUnit }) => ({
          product: product._id,
          quantity,
          unit,
          conversionRate,
          unitPrice,
          smallestUnit,
        }))
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
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Grid container spacing={2}>
                <Grid item xs={2.4}>
                  <TextField
                    label="Số lượng"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={2.4}>
                  <FormControl fullWidth>
                    <InputLabel>Đơn vị</InputLabel>
                    <Select
                      value={unit}
                      label="Đơn vị"
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2.4}>
                  <TextField
                    label="Quy đổi"
                    type="number"
                    fullWidth
                    value={conversionRate}
                    onChange={(e) => setConversionRate(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={2.4}>
                  <FormControl fullWidth>
                    <InputLabel>Đơn vị nhỏ nhất</InputLabel>
                    <Select
                      value={smallestUnit}
                      label="Đơn vị nhỏ nhất"
                      onChange={(e) => setSmallestUnit(e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2.4}>
                  <TextField
                    label="Giá nhập"
                    type="number"
                    fullWidth
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
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
          </Grid>
        </Paper>

        

        {orderItems.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Danh sách sản phẩm đã chọn
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên sản phẩm</TableCell>
                      <TableCell>Đơn vị</TableCell>
                      <TableCell>SL</TableCell>
                      <TableCell>Quy đổi</TableCell>
                      <TableCell>SL nhỏ nhất</TableCell>
                      <TableCell>Đơn vị nhỏ nhất</TableCell>
                      <TableCell>Giá nhập</TableCell>
                      <TableCell>Thành tiền</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <IconButton onClick={() => updateQuantity(item.product, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          {item.quantity}
                          <IconButton onClick={() => updateQuantity(item.product, 1)}>
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{item.conversionRate}</TableCell>
                        <TableCell>{item.quantity * item.conversionRate}</TableCell>
                        <TableCell>{item.smallestUnit}</TableCell>
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
                Tổng tiền: {calculateTotal().toLocaleString()} đ
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
                      {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.totalAmount.toLocaleString()} đ</TableCell>
                    <TableCell>{order.status}</TableCell>
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
                        <TableCell>Quy đổi</TableCell>
                        <TableCell>Đơn giá</TableCell>
                        <TableCell>Đơn vị nhỏ nhất</TableCell>
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
                              value={item.conversionRate}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "conversionRate", Number(e.target.value))
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
                          <TableCell>
                            <Select
                              value={item.smallestUnit}
                              onChange={(e) => 
                                handleEditOrderItemChange(index, "smallestUnit", e.target.value)
                              }
                            >
                              {UNITS.map((unit) => (
                                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                              ))}
                            </Select>
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
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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