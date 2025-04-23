// frontend/src/pages/ShelfInventoryPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';

function ShelfInventoryPage() {
    const [shelfData, setShelfData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/inventories/on-shelf', {
                params: { search: searchTerm, status: statusFilter },
            });
            setShelfData(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Lỗi khi tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchTerm, statusFilter]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleStatusChange = (event) => {
        setStatusFilter(event.target.value);
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" component="h1" gutterBottom>
                Quản Lý Quầy Hàng
            </Typography>

            <Box mb={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        label="Tìm kiếm (Tên/SKU/Mã Lô)"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        size="small"
                    />
                    <FormControl size="small">
                        <InputLabel id="status-filter-label">Trạng Thái Lô</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            id="status-filter"
                            value={statusFilter}
                            label="Trạng Thái Lô"
                            onChange={handleStatusChange}
                        >
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="expired">Expired</MenuItem>
                            <MenuItem value="sold_out">Sold Out</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center">
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="shelf inventory table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Tên Sản Phẩm</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell>Mã Lô Hàng</TableCell>
                                <TableCell align="right">Số Lượng Trên Quầy</TableCell>
                                <TableCell align="right">Số Lượng Trong Kho</TableCell>
                                <TableCell>Ngày Sản Xuất</TableCell>
                                <TableCell>Hạn Sử Dụng</TableCell>
                                <TableCell>Danh sách lô sản phẩm</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {/* {shelfData?.map((item) => (
                                <TableRow
                                    key={item._id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">
                                        {item.product?.name}
                                    </TableCell>
                                    <TableCell>{item.product?.SKU}</TableCell>
                                    <TableCell>{item.batch?.batchCode}</TableCell>
                                    <TableCell align="right">{item.shelf_quantity}</TableCell>
                                    <TableCell>{item.batch?.manufacture_day ? format(new Date(item.batch.manufacture_day), 'dd/MM/yyyy') : '-'}</TableCell>
                                    <TableCell>{item.batch?.expiry_day ? format(new Date(item.batch.expiry_day), 'dd/MM/yyyy') : '-'}</TableCell>
                                    <TableCell>{item.batch?.status}</TableCell>
                                </TableRow>
                            ))} */}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
}

export default ShelfInventoryPage;