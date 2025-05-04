import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const OrderManagementPage = () => {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [openHoldDialog, setOpenHoldDialog] = useState(false);
    const [holdOrderItems, setHoldOrderItems] = useState([]);

    // State và logic cho dialog tạo hóa đơn
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [createProducts, setCreateProducts] = useState([]);
    const [createCartItems, setCreateCartItems] = useState([]);
    const [createCustomerDetails, setCreateCustomerDetails] = useState({ name: '', phone: '' });
    const [createSnackbar, setCreateSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchOrders = async (query = {}) => {
        try {
            const res = await axios.get('http://localhost:8000/api/orders', { params: query });
            setOrders(res.data);
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error);
            setSnackbar({ open: true, message: 'Lỗi khi tải đơn hàng', severity: 'error' });
        }
    };

    const fetchProductsForCreate = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/products');
            setCreateProducts(res.data);
        } catch (error) {
            console.error('Lỗi khi tải sản phẩm để tạo đơn hàng:', error);
            setCreateSnackbar({ open: true, message: 'Lỗi khi tải sản phẩm.', severity: 'error' });
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleFilterStatusChange = (event) => {
        setFilterStatus(event.target.value);
    };

    const filteredOrders = orders.filter(order =>
        (order.customerDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order._id?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterStatus === '' || order.status === filterStatus)
    );

    const handleCancelOrder = async (orderId) => {
        if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
            try {
                const res = await axios.put(`http://localhost:8000/api/orders/${orderId}/cancel`);
                setSnackbar({ open: true, message: res.data.message, severity: 'success' });
                fetchOrders();
            } catch (error) {
                console.error('Lỗi khi hủy đơn hàng:', error);
                setSnackbar({ open: true, message: 'Lỗi khi hủy đơn hàng', severity: 'error' });
            }
        }
    };

    const handleHoldOrder = async (order) => {
        setSelectedOrder(order);
        setHoldOrderItems(order.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            name: item.product.name,
            batch: item.batch?._id
        })));
        setOpenHoldDialog(true);
    };

    const handleResumeOrder = async () => {
        if (!selectedOrder) return;
        try {
            const res = await axios.put(`http://localhost:8000/api/orders/${selectedOrder._id}/resume`, { items: holdOrderItems });
            setSnackbar({ open: true, message: 'Đơn hàng đã được tiếp tục và cập nhật.', severity: 'success' });
            setOpenHoldDialog(false);
            fetchOrders();
        } catch (error) {
            console.error('Lỗi khi tiếp tục đơn hàng:', error);
            setSnackbar({ open: true, message: 'Lỗi khi tiếp tục đơn hàng.', severity: 'error' });
        }
    };

    const handleHoldItemQuantityChange = (index, value) => {
        const newItems = [...holdOrderItems];
        newItems[index].quantity = parseInt(value, 10) || 0;
        setHoldOrderItems(newItems);
    };

    const handleViewOrderDetails = async (orderId) => {
        try {
            const res = await axios.get(`http://localhost:8000/api/orders/${orderId}`);
            setSelectedOrder(res.data);
            setOpenViewDialog(true);
        } catch (error) {
            console.error('Lỗi khi xem chi tiết đơn hàng:', error);
            setSnackbar({ open: true, message: 'Lỗi khi xem chi tiết đơn hàng', severity: 'error' });
        }
    };

    const handlePrintOrder = () => {
        if (selectedOrder) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Hóa Đơn - ${selectedOrder._id}</title>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            .invoice { width: 80%; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .customer-info { margin-bottom: 15px; }
                            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            .total { text-align: right; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <div class="invoice">
                            <div class="header">
                                <h2>HÓA ĐƠN</h2>
                                <p>Mã đơn hàng: ${selectedOrder._id}</p>
                                <p>Ngày tạo: ${format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                            </div>
                            <div class="customer-info">
                                <h3>Thông tin khách hàng:</h3>
                                <p>Tên: ${selectedOrder.customerDetails?.name || 'Không có'}</p>
                                <p>Điện thoại: ${selectedOrder.customerDetails?.phone || 'Không có'}</p>
                            </div>
                            <h3>Chi tiết sản phẩm:</h3>
                            <table class="items-table">
                                <thead>
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th>Lô hàng</th>
                                        <th>Số lượng</th>
                                        <th>Giá đơn vị</th>
                                        <th>Giảm giá</th>
                                        <th>Tổng giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${selectedOrder.items.map(item => `
                                        <tr>
                                            <td>${item.product?.name}</td>
                                            <td>${item.batch?.batchNumber || 'Không có'}</td>
                                            <td>${item.quantity}</td>
                                            <td>${item.unitPrice?.toLocaleString()} đ</td>
                                            <td>${item.appliedDiscount ? `${item.appliedDiscount.value}%` : 'Không có'}</td>
                                            <td>${item.totalPrice?.toLocaleString()} đ</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="total">
                                <p>Tổng tiền hàng: ${selectedOrder.totalAmount?.toLocaleString()} đ</p>
                                <p>Giảm giá: - ${selectedOrder.totalDiscount?.toLocaleString()} đ</p>
                                <p>Phí vận chuyển: ${selectedOrder.shippingFee?.toLocaleString()} đ</p>
                                <p>Thuế: ${selectedOrder.taxAmount?.toLocaleString()} đ</p>
                                <h3>Tổng thanh toán: ${selectedOrder.finalAmount?.toLocaleString()} đ</h3>
                            </div>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleOpenCreateDialog = () => {
        setOpenCreateDialog(true);
        fetchProductsForCreate();
        setCreateCartItems([]);
        setCreateCustomerDetails({ name: '', phone: '' });
    };

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
    };

    const handleCreateAddToCart = (product) => {
        const existingItem = createCartItems.find(item => item._id === product._id);
        if (existingItem) {
            setCreateCartItems(createCartItems.map(item =>
                item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCreateCartItems([...createCartItems, { ...product, quantity: 1 }]);
        }
    };

    const handleCreateQuantityChange = (productId, quantity) => {
        setCreateCartItems(createCartItems.map(item =>
            item._id === productId ? { ...item, quantity: parseInt(quantity, 10) || 0 } : item
        ).filter(item => item.quantity > 0));
    };

    const handleCreateRemoveFromCart = (productId) => {
        setCreateCartItems(createCartItems.filter(item => item._id !== productId));
    };

    const handleCreateCustomerInfoChange = (e) => {
        const { name, value } = e.target;
        setCreateCustomerDetails({ ...createCustomerDetails, [name]: value });
    };

    const handleCreateSubmitOrder = async () => {
        if (!createCustomerDetails.name || !createCustomerDetails.phone || createCartItems.length === 0) {
            setCreateSnackbar({ open: true, message: 'Vui lòng nhập thông tin khách hàng và chọn sản phẩm.', severity: 'error' });
            return;
        }

        const items = createCartItems.map(item => ({ product: item._id, quantity: item.quantity }));
        const orderData = { customerDetails: createCustomerDetails, items };

        try {
            const res = await axios.post('http://localhost:8000/api/orders/create', orderData);
            setCreateSnackbar({ open: true, message: 'Tạo đơn hàng thành công!', severity: 'success' });
            setOpenCreateDialog(false);
            fetchOrders(); // Tải lại danh sách đơn hàng sau khi tạo thành công
        } catch (error) {
            console.error('Lỗi khi tạo đơn hàng:', error);
            setCreateSnackbar({ open: true, message: 'Lỗi khi tạo đơn hàng.', severity: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" mb={3}>Quản Lý Hóa Đơn</Typography>
            <Grid container spacing={2} mb={2} alignItems="center">
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Tìm kiếm theo tên khách hàng hoặc ID đơn hàng"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="status-filter-label">Lọc theo trạng thái</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            id="status-filter"
                            value={filterStatus}
                            label="Lọc theo trạng thái"
                            onChange={handleFilterStatusChange}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="pending">Chờ xử lý</MenuItem>
                            <MenuItem value="completed">Đã hoàn thành</MenuItem>
                            <MenuItem value="cancelled">Đã hủy</MenuItem>
                            <MenuItem value="pending_hold">Đang chờ</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={2} sx={{ textAlign: 'right' }}>
                    <Button variant="contained" color="primary" onClick={handleOpenCreateDialog}>
                        Tạo Hóa Đơn
                    </Button>
                </Grid>
            </Grid>

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="Danh sách đơn hàng">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID Đơn Hàng</TableCell>
                            <TableCell>Khách Hàng</TableCell>
                            <TableCell>Ngày Tạo</TableCell>
                            <TableCell>Tổng Tiền</TableCell>
                            <TableCell>Trạng Thái</TableCell>
                            <TableCell align="right">Hành Động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow
                                key={order._id}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell component="th" scope="row">{order._id}</TableCell>
                                <TableCell>{order.customerDetails?.name || 'Không có thông tin'}</TableCell>
                                <TableCell>{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</TableCell>
                                <TableCell>{order.finalAmount?.toLocaleString()} đ</TableCell>
                                <TableCell>{order.status}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleViewOrderDetails(order._id)} aria-label="xem chi tiết">
                                        <VisibilityIcon />
                                    </IconButton>
                                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                                        <>
                                            <IconButton onClick={() => handleCancelOrder(order._id)} aria-label="hủy đơn hàng">
                                                <CancelIcon color="error" />
                                            </IconButton>
                                            {order.status !== 'pending_hold' ? (
                                                <IconButton onClick={() => handleHoldOrder(order)} aria-label="tạm giữ đơn hàng">
                                                    <PauseIcon color="warning" />
                                                </IconButton>
                                            ) : (
                                                <IconButton onClick={handleResumeOrder} aria-label="tiếp tục đơn hàng">
                                                    <PlayArrowIcon color="success" />
                                                </IconButton>
                                            )}
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog xem chi tiết đơn hàng */}
            <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="md">
                <DialogTitle>Chi Tiết Đơn Hàng</DialogTitle>
                <DialogContent>
                    {selectedOrder && (
                        <Box>
                            <Typography variant="h6" mb={2}>Thông Tin Khách Hàng</Typography></Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenViewDialog(false)}>Đóng</Button>
                    {selectedOrder && (
                        <Button onClick={handlePrintOrder} variant="outlined">
                            In Hóa Đơn
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Dialog tạm giữ đơn hàng */}
            <Dialog open={openHoldDialog} onClose={() => setOpenHoldDialog(false)} fullWidth maxWidth="md">
                <DialogTitle>Chỉnh Sửa Đơn Hàng Tạm Giữ</DialogTitle>
                <DialogContent>
                    {selectedOrder && holdOrderItems.map((item, index) => (
                        <Grid container spacing={2} key={index} alignItems="center" mb={2}>
                            <Grid item xs={6}>
                                <Typography>{item.name}</Typography>
                            </Grid>
                            <Grid item xs={3}>
                                <TextField
                                    type="number"
                                    label="Số lượng"
                                    value={item.quantity}
                                    onChange={(e) => handleHoldItemQuantityChange(index, e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <Typography>
                                    Lô: {item.batch || 'Không xác định'}
                                </Typography>
                            </Grid>
                        </Grid>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHoldDialog(false)}>Hủy</Button>
                    <Button onClick={handleResumeOrder} variant="contained" color="primary">Tiếp Tục Đơn Hàng</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog tạo hóa đơn */}
            <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} fullWidth maxWidth="md">
                <DialogTitle>Tạo Hóa Đơn Mới</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} mb={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Tên Khách Hàng"
                                name="name"
                                value={createCustomerDetails.name}
                                onChange={handleCreateCustomerInfoChange}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Số Điện Thoại"
                                name="phone"
                                value={createCustomerDetails.phone}
                                onChange={handleCreateCustomerInfoChange}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="h6" mb={1}>Chọn Sản Phẩm</Typography>
                    <Grid container spacing={2}>
                        {createProducts.map(product => (
                            <Grid item xs={12} sm={6} md={4} key={product._id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">{product.name}</Typography>
                                        <Typography variant="body2">Giá: {product.price?.toLocaleString()} đ</Typography>
                                        <Button onClick={() => handleCreateAddToCart(product)} variant="outlined" size="small" startIcon={<AddShoppingCartIcon />}>Thêm vào giỏ</Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    <Typography variant="h6" mt={2} mb={1}>Giỏ Hàng</Typography>
                    {createCartItems.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Sản phẩm</TableCell>
                                        <TableCell>Số lượng</TableCell>
                                        <TableCell>Giá</TableCell>
                                        <TableCell>Tổng</TableCell>
                                        <TableCell>Hành động</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {createCartItems.map(item => (
                                        <TableRow key={item._id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleCreateQuantityChange(item._id, e.target.value)}
                                                    size="small"
                                                    sx={{ width: '60px' }}
                                                />
                                            </TableCell>
                                            <TableCell>{item.price?.toLocaleString()} đ</TableCell>
                                            <TableCell>{(item.price * item.quantity)?.toLocaleString()} đ</TableCell>
                                            <TableCell>
                                                <IconButton onClick={() => handleCreateRemoveFromCart(item._id)} size="small" color="error">
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} align="right">Tổng cộng:</TableCell>
                                        <TableCell>{createCartItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0)?.toLocaleString()} đ</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography>Giỏ hàng trống.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog}>Hủy</Button>
                    <Button onClick={handleCreateSubmitOrder} variant="contained" color="primary" disabled={createCartItems.length === 0}>
                        Tạo Đơn Hàng
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
            <Snackbar
                open={createSnackbar.open}
                autoHideDuration={3000}
                onClose={() => setCreateSnackbar({ ...createSnackbar, open: false })}
            >
                <Alert severity={createSnackbar.severity}>{createSnackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default OrderManagementPage;