import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

function ManagerOrder() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const authToken = localStorage.getItem("authToken");

  useEffect(() => {
    fetchOrders();
  }, [searchQuery, filterPaymentStatus, authToken]);

  const fetchOrders = async () => {
    try {
      const params = {};
      if (searchQuery) {
        params.orderNumber = { $regex: searchQuery, $options: "i" };
      }
      if (filterPaymentStatus) {
        params.paymentStatus = filterPaymentStatus;
      }

      const response = await axios.get("http://localhost:8000/api/orders", {
        params,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setOrders(response.data);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterPaymentStatusChange = (event) => {
    setFilterPaymentStatus(event.target.value);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedOrder(null);
  };

  const handlePrintOrder = (order) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
          <head>
            <title>Hóa đơn #${order.orderNumber}</title>
            <style>
              body { font-family: 'Arial', sans-serif; }
              h2, h4 { text-align: center; }
              .order-info { margin-bottom: 20px; }
              .customer-info p, .order-details p { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { margin-top: 10px; text-align: right; font-weight: bold; }
              .notes { margin-top: 20px; font-style: italic; }
            </style>
          </head>
          <body>
            <h2>HÓA ĐƠN BÁN HÀNG</h2>
            <h4>Mã đơn hàng: ${order.orderNumber}</h4>

            <div class="order-info">
              <div class="customer-info">
                <h3>Thông tin khách hàng:</h3>
                <p><strong>Khách hàng:</strong> ${
                  order.customerId?.fullName || "Khách vãng lai"
                }</p>
                ${
                  order.customerId?.phone
                    ? `<p><strong>Điện thoại:</strong> ${order.customerId.phone}</p>`
                    : ""
                }
                ${
                  order.customerId?.address
                    ? `<p><strong>Địa chỉ:</strong> ${order.customerId.address}</p>`
                    : ""
                }
              </div>

              <div class="order-details">
                <h3>Thông tin đơn hàng:</h3>
                <p><strong>Ngày tạo:</strong> ${format(
                  new Date(order.createdAt),
                  "dd/MM/yyyy HH:mm",
                  { locale: vi }
                )}</p>
                <p><strong>Nhân viên tạo đơn hàng:</strong> ${
                  order.employeeId?.fullName || "N/A"
                }</p>
                <p><strong>Tình trạng thanh toán:</strong> ${renderPaymentStatus(
                  order.paymentStatus
                )}</p>
                <p><strong>Phương thức thanh toán:</strong> ${
                  order.paymentMethod
                }</p>
                ${
                  order.depositAmount > 0
                    ? `<p><strong>Số tiền đặt cọc:</strong> ${order.depositAmount.toLocaleString(
                        "vi-VN",
                        { style: "currency", currency: "VND" }
                      )}</p>`
                    : ""
                }
              </div>
            </div>

            <h3>Chi tiết sản phẩm:</h3>
            <table>
              <thead>
                <tr>
                  <th>ID Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Đơn vị</th>
                  <th>Giá đơn vị</th>
                  <th>Giảm giá (%)</th>
                </tr>
              </thead>
              <tbody>
                ${order.products
                  .map(
                    (item) => `
                    <tr>
                      <td>${item.productId}</td>
                      <td>${item.quantity}</td>
                      <td>${item.selectedUnitName}</td>
                      <td>${
                        item.unitPrice?.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }) || "N/A"
                      }</td>
                      <td>${item.discount || 0}%</td>
                    </tr>
                  `
                  )
                  .join("")}
                <tr>
                  <td colspan="4" style="text-align: right;"><strong>Tổng tiền:</strong></td>
                  <td>${
                    order.totalAmount?.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }) || "N/A"
                  }</td>
                </tr>
                ${
                  order.discountAmount > 0
                    ? `
                    <tr>
                      <td colspan="4" style="text-align: right;"><strong>Giảm giá:</strong></td>
                      <td>${order.discountAmount.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      })}</td>
                    </tr>
                  `
                    : ""
                }
                ${
                  order.taxRate > 0
                    ? `
                    <tr>
                      <td colspan="4" style="text-align: right;"><strong>Thuế (${
                        order.taxRate * 100
                      }%):</strong></td>
                      <td>${
                        order.taxAmount?.toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }) || "N/A"
                      }</td>
                    </tr>
                  `
                    : ""
                }
                <tr>
                  <td colspan="4" style="text-align: right;"><strong>Thành tiền:</strong></td>
                  <td>${
                    order.finalAmount?.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }) || "N/A"
                  }</td>
                </tr>
              </tbody>
            </table>

            ${
              order.notes
                ? `<div class="notes"><strong>Ghi chú:</strong> ${order.notes}</div>`
                : ""
            }
          </body>
        </html>
      `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TextField
          label="Tìm kiếm theo mã đơn hàng"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ mr: 2, flexGrow: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          {" "}
          {/* Thêm minWidth */}
          <InputLabel id="payment-status-filter-label">
            TT Thanh toán
          </InputLabel>
          <Select
            labelId="payment-status-filter-label"
            id="payment-status-filter"
            value={filterPaymentStatus}
            onChange={handleFilterPaymentStatusChange}
            label="TT Thanh toán"
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="pending">Chưa thanh toán</MenuItem>
            <MenuItem value="partial">Thanh toán một phần</MenuItem>
            <MenuItem value="paid">Đã thanh toán</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="Danh sách đơn hàng">
          <TableHead>
            <TableRow>
              <TableCell>Mã đơn hàng</TableCell>
              <TableCell>Khách hàng</TableCell>
              <TableCell>Ngày tạo</TableCell>
              <TableCell>Nhân viên tạo đơn hàng</TableCell>
              <TableCell>Thành tiền</TableCell>
              <TableCell sx={{ width: "150px" }}>TT Thanh toán</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order._id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {order.orderNumber}
                </TableCell>
                <TableCell>
                  {order.customerId?.fullName || "Khách vãng lai"}
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })}
                </TableCell>
                <TableCell>{order.employeeId?.fullName || "N/A"}</TableCell>
                <TableCell>
                  {order.finalAmount?.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }) || "N/A"}
                </TableCell>
                <TableCell sx={{ width: "150px" }}>
                  {renderPaymentStatus(order.paymentStatus)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label="xem chi tiết"
                    onClick={() => handleViewDetails(order)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    aria-label="in hóa đơn"
                    onClick={() => handlePrintOrder(order)}
                  >
                    <PrintIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedOrder && (
        <OrderDetailDialog
          open={isDetailsOpen}
          onClose={handleCloseDetails}
          order={selectedOrder}
          authToken={authToken}
        />
      )}
    </Box>
  );
}

function OrderDetailDialog({ open, onClose, order, authToken }) {
  if (!order) return null;

  const [batchDetails, setBatchDetails] = useState({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fetchBatchDetails = async (batchIds) => {
    setLoadingBatches(true);
    try {
      const batchPromises = batchIds.map((batchId) =>
        axios.get(`http://localhost:8000/api/batches/${batchId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );
      const batchResponses = await Promise.all(batchPromises);
      const batchData = batchResponses.reduce((acc, res) => {
        acc[res.data._id] = res.data;
        return acc;
      }, {});
      setBatchDetails(batchData);
    } catch (error) {
      console.error("Lỗi khi tải thông tin batch:", error);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (order && order.products) {
      const uniqueBatchIds = new Set();
      order.products.forEach((product) => {
        if (product.batchesUsed && product.batchesUsed.length > 0) {
          product.batchesUsed.forEach((batch) =>
            uniqueBatchIds.add(batch.batchId)
          );
        }
      });
      if (uniqueBatchIds.size > 0) {
        fetchBatchDetails(Array.from(uniqueBatchIds));
      }
    }
  }, [order, authToken]);

  const getBatchDiscount = (productId) => {
    const product = order.products.find((p) => p.productId === productId);
    if (product && product.batchesUsed && product.batchesUsed.length > 0) {
      // For simplicity, lấy thông tin từ batch đầu tiên.
      const firstBatchId = product.batchesUsed[0].batchId;
      const batch = batchDetails[firstBatchId];
      return batch ? batch.discountInfo?.discountValue || 0 : 0;
    }
    return 0;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Chi tiết đơn hàng #{order.orderNumber}</DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          Thông tin khách hàng
        </Typography>
        <Typography>
          Khách hàng: {order.customerId?.fullName || "Khách vãng lai"}
        </Typography>
        {order.customerId?.phone && (
          <Typography>Điện thoại: {order.customerId.phone}</Typography>
        )}
        {order.customerId?.address && (
          <Typography>Địa chỉ: {order.customerId.address}</Typography>
        )}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Thông tin đơn hàng
        </Typography>
        <Typography>
          Ngày tạo:{" "}
          {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", {
            locale: vi,
          })}
        </Typography>
        <Typography>
          Nhân viên tạo đơn hàng: {order.employeeId?.fullName || "N/A"}
        </Typography>
        <Typography>
          TT Thanh toán: {renderPaymentStatus(order.paymentStatus)}
        </Typography>
        <Typography>Phương thức thanh toán: {order.paymentMethod}</Typography>
        {order.depositAmount > 0 && (
          <Typography>
            Số tiền đặt cọc:{" "}
            {order.depositAmount.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Typography>
        )}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Sản phẩm
        </Typography>
        <TableContainer component={Paper}>
          <Table aria-label="Chi tiết sản phẩm đơn hàng">
            <TableHead>
              <TableRow>
                <TableCell>Id sản phẩm</TableCell>
                <TableCell>Số lượng</TableCell>
                <TableCell>Đơn vị</TableCell>
                <TableCell>Giá đơn vị</TableCell>
                <TableCell>Giảm giá (%)</TableCell>
                <TableCell>Thành tiền</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.products.map((item) => {
                const batchDiscount = getBatchDiscount(item.productId);
                return (
                  <TableRow key={item._id}>
                    <TableCell>{item.productId}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.selectedUnitName}</TableCell>
                    <TableCell>
                      {item.unitPrice?.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }) || "N/A"}
                    </TableCell>
                    <TableCell>{item.discount + batchDiscount || 0}%</TableCell>
                    <TableCell>
                      {order.totalAmount?.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }) || "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {order.discountAmount > 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="right">
                    Đã giảm giá:
                  </TableCell>
                  <TableCell>
                    {order.discountAmount.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </TableCell>
                </TableRow>
              )}
              {order.taxRate > 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="right">
                    Thuế ({order.taxRate * 100}%):
                  </TableCell>
                  <TableCell>
                    {order.taxAmount?.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }) || "N/A"}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={5} align="right">
                  Tổng thành tiền:
                </TableCell>
                <TableCell>
                  {order.finalAmount?.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }) || "N/A"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        {order.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Ghi chú:</Typography>
            <Typography>{order.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
        <Button
          onClick={() => handlePrintOrder(order)}
          startIcon={<PrintIcon />}
        >
          In hóa đơn
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const renderPaymentStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case "pending":
      return "Chưa thanh toán";
    case "partial":
      return "Thanh toán một phần";
    case "paid":
      return "Đã thanh toán";
    default:
      return paymentStatus;
  }
};

export default ManagerOrder;
