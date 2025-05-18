import React, { useState, useEffect, useMemo } from "react";
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
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrintIcon from "@mui/icons-material/Print";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axios from "axios";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

function ManagerOrder() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const authToken = localStorage.getItem("authToken");
  const [filterTimeRange, setFilterTimeRange] = useState("day");
  const [filterDate, setFilterDate] = useState(new Date());
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });
  const [weekPickerDate, setWeekPickerDate] = useState(new Date());

  useEffect(() => {
    fetchOrders();
  }, [
    searchQuery,
    filterPaymentStatus,
    filterTimeRange,
    filterDate,
    filterStartDate,
    filterEndDate,
    authToken,
  ]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("$or", searchQuery);
      }
      if (filterPaymentStatus) {
        params.append("paymentStatus", filterPaymentStatus);
      }

      if (filterTimeRange === "day" && filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append("startDate", startOfDay.toISOString());
        params.append("endDate", endOfDay.toISOString());
      } else if (filterTimeRange === "week" && weekPickerDate) {
        const startOfCurrentWeek = startOfWeek(weekPickerDate, { locale: vi });
        const endOfCurrentWeek = endOfWeek(weekPickerDate, { locale: vi });
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        endOfCurrentWeek.setHours(23, 59, 59, 999);
        params.append("startDate", startOfCurrentWeek.toISOString());
        params.append("endDate", endOfCurrentWeek.toISOString());
      } else if (filterTimeRange === "month" && filterDate) {
        const startOfCurrentMonth = startOfMonth(filterDate);
        const endOfCurrentMonth = endOfMonth(filterDate);
        startOfCurrentMonth.setHours(0, 0, 0, 0);
        endOfCurrentMonth.setHours(23, 59, 59, 999);
        params.append("startDate", startOfCurrentMonth.toISOString());
        params.append("endDate", endOfCurrentMonth.toISOString());
      } else if (
        filterTimeRange === "custom" &&
        filterStartDate &&
        filterEndDate
      ) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
      }

      const response = await axios.get(
        `http://localhost:8000/api/orders?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
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
            body { font-family: 'Arial', sans-serif; font-size: 12px; line-height: 1.3; }
            .receipt { width: 380px; margin: 0 auto; padding: 20px; border-bottom: 1px dashed #000; }
            .header { text-align: center; margin-bottom: 15px; }
            .header h2 { font-size: 1.6em; margin-bottom: 5px; }
            .header p { margin: 2px 0; font-size: 0.9em; }
            .info-section { margin-bottom: 10px; }
            .info-title { font-weight: bold; margin-bottom: 5px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 0.95em; }
            .items { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items th, .items td { padding: 8px 5px; text-align: left; border-bottom: 1px dashed #eee; }
            .items th { font-weight: bold; font-size: 1em; }
            .items td { font-size: 0.95em; }
            .total-row { display: flex; justify-content: space-between; margin-top: 8px; font-size: 1em; padding-top: 5px; border-top: 1px solid #ccc; }
            .total-row strong { font-weight: bold; }
            .footer { text-align: center; margin-top: 15px; font-size: 0.9em; font-style: italic; }
            .product-info { display: flex; flex-direction: column; }
            .product-name { font-weight: bold; }
            .discount { font-size: 0.8em; color: #777; }
            .amount { text-align: right; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>CỬA HÀNG BÁN LẺ ABC</h2>
              <p>Địa chỉ: 123 Đường XYZ, Quận ..., TP.HCM</p>
              <p>Điện thoại: 09xxxxxxxxxx</p>
              <p>MST: 0123456789</p>
            </div>
            <div class="info-section">
              <div class="info-title">Thông tin đơn hàng:</div>
              <div class="info"><span>Mã đơn hàng:</span> <span>${
                order.orderNumber
              }</span></div>
              <div class="info"><span>Ngày:</span> <span>${format(
                new Date(order.createdAt),
                "dd/MM/yyyy HH:mm",
                { locale: vi }
              )}</span></div>
              <div class="info"><span>Nhân viên:</span> <span>${
                order.employeeId?.fullName || "Không xác định"
              }</span></div>
            </div>
            <div class="info-section">
              <div class="info-title">Thông tin khách hàng:</div>
              <div class="info"><span>Khách hàng:</span> <span>${
                order.customerId?.fullName || "Khách hàng vãng lai"
              }</span></div>
              ${
                order.customerId?.phone
                  ? `<div class="info"><span>Điện thoại:</span> <span>${order.customerId.phone}</span></div>`
                  : ""
              }
              ${
                order.customerId?.address
                  ? `<div class="info"><span>Địa chỉ:</span> <span>${order.customerId.address}</span></div>`
                  : ""
              }
            </div>
            <table class="items">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style="text-align: right;">SL</th>
                  <th>ĐVT</th>
                  <th style="text-align: right;">Đơn giá</th>
                  <th style="text-align: right;">Giảm</th>
                  <th style="text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${order.products
                  .map((item) => {
                    const discountPercent =
                      item.originalUnitPrice > 0
                        ? Math.round(
                            ((item.originalUnitPrice - item.unitPrice) /
                              item.originalUnitPrice) *
                              100
                          )
                        : 0;
                    const discountAmount =
                      item.originalUnitPrice - item.unitPrice;
                    return `
                      <tr>
                        <td><div class="product-info"><div class="product-name">${
                          item.productId?.name || "Đang tải..."
                        }</div></div></td>
                        <td class="amount">${item.quantity}</td>
                        <td>${item.selectedUnitName}</td>
                        <td class="amount">${item.originalUnitPrice?.toLocaleString(
                          "vi-VN"
                        )} VNĐ</td>
                        <td class="amount">${discountPercent}% ${
                      discountAmount > 0
                        ? `(${discountAmount.toLocaleString("vi-VN")} VNĐ)`
                        : ""
                    }</td>
                        <td class="amount">${item.itemTotal?.toLocaleString(
                          "vi-VN"
                        )} VNĐ</td>
                      </tr>
                    `;
                  })
                  .join("")}
                <tr><td colspan="6"><hr/></td></tr>
                ${
                  order.discountAmount > 0
                    ? `<tr class="total-row"><td colspan="5">Giảm giá (tổng):</td><td class="amount">- ${order.discountAmount.toLocaleString(
                        "vi-VN"
                      )} VNĐ</td></tr>`
                    : ""
                }
                ${
                  order.taxRate > 0
                    ? `<tr class="total-row"><td colspan="5">Thuế (${
                        order.taxRate * 100
                      }%):</td><td class="amount">${order.taxAmount?.toLocaleString(
                        "vi-VN"
                      )} VNĐ</td></tr>`
                    : ""
                }
                <tr class="total-row">
                  <td colspan="5"><strong>Tổng cộng:</strong></td>
                  <td class="amount"><strong>${order.finalAmount?.toLocaleString(
                    "vi-VN"
                  )} VNĐ</strong></td>
                </tr>
                ${
                  order.depositAmount > 0
                    ? `<tr class="total-row"><td colspan="5">Đặt cọc:</td><td class="amount">${order.depositAmount.toLocaleString(
                        "vi-VN"
                      )} VNĐ</td></tr>`
                    : ""
                }
                ${
                  (order.amountPaid !== undefined &&
                    order.paymentStatus !== "pending") ||
                  order.depositAmount > 0
                    ? `
                      <tr class="total-row"><td colspan="5"><strong>${
                        order.amountPaid - order.finalAmount >= 0
                          ? "Tiền thừa:"
                          : "Còn lại:"
                      }</strong></td>
                      <td class="amount"><strong>${(
                        order.amountPaid - order.finalAmount
                      ).toLocaleString("vi-VN")} VNĐ</strong></td></tr>`
                    : ""
                }
              </tbody>
            </table>
            <div class="info-section">
              <div class="info-title">Thông tin thanh toán:</div>
              <div class="info"><span>Phương thức:</span> <span>${
                order.paymentMethod === "cash"
                  ? "Tiền mặt"
                  : order.paymentMethod === "transfer"
                  ? "Chuyển khoản"
                  : order.paymentMethod || "Không xác định"
              }</span></div>
              <div class="info"><span>Trạng thái:</span> <span>${renderPaymentStatus(
                order.paymentStatus
              )}</span></div>
            </div>
            ${
              order.notes
                ? `<div class="info-section"><div class="info-title">Ghi chú:</div><p>${order.notes}</p></div>`
                : ""
            }
            <div class="footer">
              <p>Cảm ơn quý khách đã mua hàng!</p>
              <p>Hẹn gặp lại quý khách!</p>
              <p>(Đây là hóa đơn bán lẻ)</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleFilterTimeRangeChange = (event) => {
    setFilterTimeRange(event.target.value);
    setFilterDate(null);
    setFilterStartDate(null);
    setFilterEndDate(null);
    setWeekPickerDate(new Date()); // Reset week picker date
  };

  const handleWeekChange = (newDate) => {
    setWeekPickerDate(newDate);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const getSortValue = (order, key) => {
    switch (key) {
      case "orderNumber":
        return order.orderNumber;
      case "customerName":
        return order.customerId?.fullName?.toLowerCase() || "";
      case "createdAt":
        return new Date(order.createdAt).getTime();
      case "employeeName":
        return order.employeeId?.fullName?.toLowerCase() || "";
      case "finalAmount":
        return order.finalAmount || 0;
      case "paymentStatus":
        return order.paymentStatus;
      default:
        return "";
    }
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig.key) return orders;

    return [...orders].sort((a, b) => {
      const valueA = getSortValue(a, sortConfig.key);
      const valueB = getSortValue(b, sortConfig.key);

      if (valueA < valueB) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [orders, sortConfig]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={vi}>
      <Box sx={{ width: "100%", p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <TextField
            label="Tìm kiếm theo mã đơn, tên KH/NV"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 180 }}>
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
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="time-range-filter-label">
              Lọc theo thời gian
            </InputLabel>
            <Select
              labelId="time-range-filter-label"
              id="time-range-filter"
              value={filterTimeRange}
              onChange={handleFilterTimeRangeChange}
              label="Lọc theo thời gian"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="day">Ngày</MenuItem>
              <MenuItem value="week">Tuần</MenuItem>
              <MenuItem value="month">Tháng</MenuItem>
              <MenuItem value="custom">Khoảng thời gian</MenuItem>
            </Select>
          </FormControl>
          {filterTimeRange === "day" && (
            <DatePicker
              label="Chọn ngày"
              value={filterDate}
              onChange={(newValue) => setFilterDate(newValue)}
              sx={{ flex: 0.5 }}
            />
          )}

          {filterTimeRange === "week" && (
            <DatePicker
              label="Chọn tuần"
              value={weekPickerDate}
              onChange={handleWeekChange}
              views={["year", "month", "week"]}
              sx={{ flex: 0.5 }}
            />
          )}

          {filterTimeRange === "month" && (
            <DatePicker
              label="Chọn tháng"
              value={filterDate}
              onChange={(newValue) => setFilterDate(newValue)}
              views={["year", "month"]}
              sx={{ flex: 0.5 }}
            />
          )}

          {filterTimeRange === "custom" && (
            <>
              <DatePicker
                label="Từ ngày"
                value={filterStartDate}
                onChange={(newValue) => setFilterStartDate(newValue)}
                sx={{ flex: 0.5 }}
              />
              <DatePicker
                label="Đến ngày"
                value={filterEndDate}
                onChange={(newValue) => setFilterEndDate(newValue)}
                sx={{ flex: 0.5 }}
              />
            </>
          )}
        </Stack>

        <TableContainer
          component={Paper}
          sx={{ maxHeight: 500, overflow: "auto" }}
        >
          <Table sx={{ minWidth: 650 }} aria-label="Danh sách đơn hàng">
            <TableHead>
              <TableRow>
                <TableCell
                  onClick={() => handleSort("orderNumber")}
                  style={{ cursor: "pointer" }}
                >
                  Mã đơn hàng {renderSortIcon("orderNumber")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("customerName")}
                  style={{ cursor: "pointer" }}
                >
                  Khách hàng {renderSortIcon("customerName")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("createdAt")}
                  style={{ cursor: "pointer" }}
                >
                  Ngày tạo {renderSortIcon("createdAt")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("employeeName")}
                  style={{ cursor: "pointer" }}
                >
                  Nhân viên tạo đơn hàng {renderSortIcon("employeeName")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("finalAmount")}
                  style={{ cursor: "pointer" }}
                >
                  Thành tiền {renderSortIcon("finalAmount")}
                </TableCell>
                <TableCell
                  onClick={() => handleSort("paymentStatus")}
                  style={{ cursor: "pointer", width: "150px" }}
                >
                  TT Thanh toán {renderSortIcon("paymentStatus")}
                </TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order) => (
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
    </LocalizationProvider>
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
        <Typography>
          Phương thức thanh toán:{" "}
          {order.paymentMethod === "cash"
            ? "Tiền mặt"
            : order.paymentMethod === "transfer"
            ? "Chuyển khoản"
            : order.paymentMethod}
        </Typography>
        {order.depositAmount > 0 && (
          <Typography>
            Số tiền đặt cọc:{" "}
            {order.depositAmount.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Typography>
        )}
        {order.amountPaid !== undefined &&
          order.paymentStatus !== "pending" && (
            <Typography>
              Tiền khách đưa:{" "}
              {order.amountPaid?.toLocaleString("vi-VN", {
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
                <TableCell>Sản phẩm</TableCell>
                <TableCell>Số lượng</TableCell>
                <TableCell>Đơn vị</TableCell>
                <TableCell>Giá gốc</TableCell>
                <TableCell>Giảm giá (%)</TableCell>
                <TableCell>Thành tiền</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.products.map((item) => {
                const batchDiscount = getBatchDiscount(item.productId);
                return (
                  <TableRow key={item._id}>
                    <TableCell>
                      {item.productId?.name || "Đang tải..."}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.selectedUnitName}</TableCell>
                    <TableCell>
                      {item.originalUnitPrice?.toLocaleString("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }) || "N/A"}
                    </TableCell>
                    <TableCell>{batchDiscount || 0}%</TableCell>
                    <TableCell>
                      {item.itemTotal?.toLocaleString("vi-VN", {
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
