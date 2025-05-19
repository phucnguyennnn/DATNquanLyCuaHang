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
      if (searchQuery) params.append("$or", searchQuery);
      if (filterPaymentStatus)
        params.append("paymentStatus", filterPaymentStatus);

      if (filterTimeRange === "day" && filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append("startDate", startOfDay.toISOString());
        params.append("endDate", endOfDay.toISOString());
      } else if (filterTimeRange === "week" && weekPickerDate) {
        const start = startOfWeek(weekPickerDate, { locale: vi });
        const end = endOfWeek(weekPickerDate, { locale: vi });
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
      } else if (filterTimeRange === "month" && filterDate) {
        const start = startOfMonth(filterDate);
        const end = endOfMonth(filterDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        params.append("startDate", start.toISOString());
        params.append("endDate", end.toISOString());
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
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setOrders(response.data);
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
    }
  };

  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleFilterPaymentStatusChange = (event) =>
    setFilterPaymentStatus(event.target.value);
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedOrder(null);
  };

  const handlePrintOrder = (order) => {
    const printContent = `
      <html>
        <head>
          <title>Hóa đơn #${order.orderNumber}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 10px; }
            .receipt { width: 380px; margin: 0 auto; padding: 20px; border-bottom: 1px dashed #000; }
            .header { text-align: center; margin-bottom: 15px; }
            .header h2 { font-size: 1.6em; margin-bottom: 5px; }
            .header p { margin: 2px 0; font-size: 0.9em; }
            .info-section { margin-bottom: 10px; }
            .info-title { font-weight: bold; margin-bottom: 5px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .items { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items th, .items td { padding: 8px 5px; text-align: left; border-bottom: 1px dashed #eee; }
            .items th { font-weight: bold; }
            .total-row { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 5px; border-top: 1px solid #ccc; }
            .footer { text-align: center; margin-top: 15px; font-style: italic; }
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
                "dd/MM/yyyy HH:mm"
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
                    const originalPrice = item.originalUnitPrice || 0;
                    const unitPrice = item.unitPrice || 0;
                    const discountPercent =
                      originalPrice > 0
                        ? Math.round(
                            ((originalPrice - unitPrice) / originalPrice) * 100
                          )
                        : 0;
                    return `
                    <tr>
                      <td>${item.productId?.name || "Đang tải..."}</td>
                      <td class="amount">${item.quantity}</td>
                      <td>${item.selectedUnitName}</td>
                      <td class="amount">${originalPrice.toLocaleString(
                        "vi-VN"
                      )} VNĐ</td>
                      <td class="amount">${discountPercent}%</td>
                      <td class="amount">${(item.itemTotal || 0).toLocaleString(
                        "vi-VN"
                      )} VNĐ</td>
                    </tr>
                  `;
                  })
                  .join("")}
                <tr><td colspan="6"><hr/></td></tr>
                ${
                  order.discountAmount > 0
                    ? `
                  <tr class="total-row">
                    <td colspan="5">Giảm giá (tổng):</td>
                    <td class="amount">- ${order.discountAmount.toLocaleString(
                      "vi-VN"
                    )} VNĐ</td>
                  </tr>`
                    : ""
                }
                ${
                  order.taxRate > 0
                    ? `
                  <tr class="total-row">
                    <td colspan="5">Thuế (${order.taxRate * 100}%):</td>
                    <td class="amount">${order.taxAmount?.toLocaleString(
                      "vi-VN"
                    )} VNĐ</td>
                  </tr>`
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
                    ? `
                  <tr class="total-row">
                    <td colspan="5">Đặt cọc:</td>
                    <td class="amount">${order.depositAmount.toLocaleString(
                      "vi-VN"
                    )} VNĐ</td>
                  </tr>`
                    : ""
                }
                ${
                  (order.amountPaid !== undefined &&
                    order.paymentStatus !== "pending") ||
                  order.depositAmount > 0
                    ? `
                  <tr class="total-row">
                    <td colspan="5"><strong>${
                      (order.amountPaid || 0) >= (order.finalAmount || 0)
                        ? "Tiền thừa:"
                        : "Còn lại:"
                    }</strong></td>
                    <td class="amount"><strong>${Math.abs(
                      (order.amountPaid || 0) - (order.finalAmount || 0)
                    ).toLocaleString("vi-VN")} VNĐ</strong></td>
                  </tr>`
                    : ""
                }
              </tbody>
            </table>
            <div class="info-section">
              <div class="info-title">Thông tin thanh toán:</div>
              <div class="info"><span>Phương thức:</span> <span>${
                {
                  cash: "Tiền mặt",
                  transfer: "Chuyển khoản",
                }[order.paymentMethod] || "Không xác định"
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
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const iframeWindow = iframe.contentWindow;
    iframeWindow.document.open();
    iframeWindow.document.write(printContent);
    iframeWindow.document.close();

    iframeWindow.onload = () => {
      setTimeout(() => {
        iframeWindow.print();
        document.body.removeChild(iframe);
      }, 500);
    };
  };

  const handleFilterTimeRangeChange = (event) => {
    setFilterTimeRange(event.target.value);
    setFilterDate(null);
    setFilterStartDate(null);
    setFilterEndDate(null);
    setWeekPickerDate(new Date());
  };

  const handleWeekChange = (newDate) => setWeekPickerDate(newDate);
  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const renderSortIcon = (key) =>
    sortConfig.key === key
      ? sortConfig.direction === "asc"
        ? "↑"
        : "↓"
      : null;

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
      return sortConfig.direction === "asc"
        ? valueA < valueB
          ? -1
          : 1
        : valueA > valueB
        ? -1
        : 1;
    });
  }, [orders, sortConfig]);

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={vi}
      localeText={{
        previousMonth: "Tháng trước",
        nextMonth: "Tháng sau",
        cancelButtonLabel: "Hủy",
        okButtonLabel: "Chọn",
      }}
    >
      <Box sx={{ width: "100%", p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <TextField
            label="Tìm kiếm theo mã đơn, tên KH/NV"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>TT Thanh toán</InputLabel>
            <Select
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
            <InputLabel>Lọc theo thời gian</InputLabel>
            <Select
              value={filterTimeRange}
              onChange={handleFilterTimeRangeChange}
              label="Lọc theo thời gian"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="day">Ngày</MenuItem>
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
              format="dd/MM/yyyy" // Thêm dòng này
            />
          )}
          {filterTimeRange === "month" && (
            <DatePicker
              label="Chọn tháng"
              value={filterDate}
              onChange={(newValue) => setFilterDate(newValue)}
              views={["year", "month"]}
              openTo="month"
              format="MM/yyyy"
              sx={{ flex: 0.5 }}
              localeText={{
                month: "Tháng",
                year: "Năm",
                previousMonth: "Tháng trước",
                nextMonth: "Tháng sau",
                cancelButtonLabel: "Hủy",
                okButtonLabel: "Chọn",
              }}
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
          <Table sx={{ minWidth: 650 }}>
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
                  Nhân viên {renderSortIcon("employeeName")}
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
                <TableRow key={order._id}>
                  <TableCell>{order.orderNumber}</TableCell>
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
                    <IconButton onClick={() => handleViewDetails(order)}>
                      <VisibilityIcon />
                    </IconButton>
                    {/* <IconButton onClick={() => handlePrintOrder(order)}>
                      <PrintIcon />
                    </IconButton> */}
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
  const [batchDetails, setBatchDetails] = useState({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fetchBatchDetails = async (batchIds) => {
    setLoadingBatches(true);
    try {
      const batchPromises = batchIds.map((batchId) =>
        axios.get(`http://localhost:8000/api/batches/${batchId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      );
      const responses = await Promise.all(batchPromises);
      const batchData = responses.reduce((acc, res) => {
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
    if (order?.products) {
      const uniqueBatchIds = new Set();
      order.products.forEach((product) => {
        if (product.batchesUsed?.length > 0) {
          product.batchesUsed.forEach((batch) =>
            uniqueBatchIds.add(batch.batchId)
          );
        }
      });
      if (uniqueBatchIds.size > 0)
        fetchBatchDetails(Array.from(uniqueBatchIds));
    }
  }, [order, authToken]);

  const getBatchDiscount = (productId) => {
    const product = order.products.find((p) => p.productId === productId);
    if (product?.batchesUsed?.length > 0) {
      const batch = batchDetails[product.batchesUsed[0].batchId];
      return batch?.discountInfo?.discountValue || 0;
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
          Nhân viên: {order.employeeId?.fullName || "N/A"}
        </Typography>
        <Typography>
          TT Thanh toán: {renderPaymentStatus(order.paymentStatus)}
        </Typography>
        <Typography>
          Phương thức:{" "}
          {{
            cash: "Tiền mặt",
            transfer: "Chuyển khoản",
          }[order.paymentMethod] || order.paymentMethod}
        </Typography>
        {order.depositAmount > 0 && (
          <Typography>
            Đặt cọc:{" "}
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
              {order.amountPaid.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Typography>
          )}

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Sản phẩm
        </Typography>
        <TableContainer component={Paper}>
          <Table>
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
              {order.products.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.productId?.name || "Đang tải..."}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.selectedUnitName}</TableCell>
                  <TableCell>
                    {(item.originalUnitPrice || 0).toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </TableCell>
                  <TableCell>{getBatchDiscount(item.productId)}%</TableCell>
                  <TableCell>
                    {(item.itemTotal || 0).toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </TableCell>
                </TableRow>
              ))}
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
                    {order.taxAmount.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={5} align="right">
                  Tổng thành tiền:
                </TableCell>
                <TableCell>
                  {order.finalAmount.toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
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
        <Button onClick={() => window.print()} startIcon={<PrintIcon />}>
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
