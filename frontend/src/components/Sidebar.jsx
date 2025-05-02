import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box, // Thêm Box để quản lý layout
} from "@mui/material";
import {
  Home,
  ShoppingCart,
  Settings,
  AccountCircle,
  Logout,
  Warehouse,
  ExpandLess,
  ExpandMore,
  Description,
  AddBox,
  Inventory,
  RecentActors,
  BusinessCenter,
  PointOfSale,
  Category,
  Handshake,
  Storefront,
  DashboardCustomize,
  Inventory2,
  MoveToInbox,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const [openInventory, setOpenInventory] = useState(false);
  const [openDashboard, setOpenDashboard] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  const role = localStorage.getItem("userRole"); // Lấy role từ localStorage

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (token) {
        console.log("Tìm thấy token:", token);
        navigate("/login");
      } else {
        console.log("Không tìm thấy Token.");
      }

      const response = await axios.post(
        "http://localhost:8000/api/auth/logout",
        {},
        {
          headers: {
            token: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userID");
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullName");
        localStorage.removeItem("role");
        localStorage.removeItem("userName");
        console.log("Đăng xuất thành công!");
        navigate("/login");
      } else {
        console.error("Đăng xuất thất bại:", response.status);
      }
    } catch (error) {
      console.error("Lỗi đăng xuất:", error.response?.data || error.message);
      if (error.response?.status === 403) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        navigate("/login");
      }
    }
  };

  const handleLogoutClick = () => {
    setOpenLogoutDialog(true);
  };

  const handleCloseLogoutDialog = () => {
    setOpenLogoutDialog(false);
  };

  const handleConfirmLogout = () => {
    setOpenLogoutDialog(false);
    handleLogout();
  };

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%", // Chiếm toàn bộ chiều cao
          }}
        >
          {/* Phần nội dung chính của Sidebar */}
          <List>
            {/* Home - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/homepage")}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Trang chủ" />
            </ListItemButton>


          {/* Inventory và các mục con - Hiển thị cho admin và staff */}
            {(role === "admin" || role === "employee") && (
              <>
                <ListItemButton
                  onClick={() => setOpenInventory(!openInventory)}
                >
                  <ListItemIcon>
                    <MoveToInbox />
                  </ListItemIcon>
                  <ListItemText primary="Nhập hàng" />
                  {openInventory ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={openInventory} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/inventory/purchase-order")}
                    >
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu đặt hàng" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/inventory/receipt")}
                    >
                      <ListItemIcon>
                        <Inventory />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu nhập kho" />
                    </ListItemButton>

                    {/* <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/inventory/add-shipment")}
                    >
                      <ListItemIcon>
                        <AddBox />
                      </ListItemIcon>
                      <ListItemText primary="Thêm lô hàng" />
                    </ListItemButton> */}
                  </List>
                </Collapse>
              </>
            )}

            
            {/* Products - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/Sales_page")}>
              <ListItemIcon>
                <PointOfSale />
              </ListItemIcon>
              <ListItemText primary="Bán hàng" />
            </ListItemButton>

                        {/* Products - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/Batchs_page")}>
              <ListItemIcon>
                <Warehouse />
              </ListItemIcon>
              <ListItemText primary="Số lượng tồn" />
            </ListItemButton>

            {(role === "admin" || role === "employee") && (
              <>
                <ListItemButton
                  onClick={() => setOpenDashboard(!openDashboard)}
                >
                  <ListItemIcon>
                    <DashboardCustomize />
                  </ListItemIcon>
                  <ListItemText primary="Quản lý chung" />
                  {openDashboard ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={openDashboard} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("products_manager")}
                    >
                      <ListItemIcon>
                        <Inventory2 />
                      </ListItemIcon>
                      <ListItemText primary="Danh mục sản phẩm" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/categories")}
                    >
                      <ListItemIcon>
                        <Category />
                      </ListItemIcon>
                      <ListItemText primary="Loại sản phẩm" />
                    </ListItemButton>

                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/suppliers")}
                    >
                      <ListItemIcon>
                        <Handshake />
                      </ListItemIcon>
                      <ListItemText primary="Nhà cung cấp" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/users")}
                    >
                      <ListItemIcon>
                        <RecentActors />
                      </ListItemIcon>
                      <ListItemText primary="Nhân viên" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/profile")}
                    >
                      <ListItemIcon>
                        <AccountCircle />
                      </ListItemIcon>
                      <ListItemText primary="Hồ sơ" />
                    </ListItemButton>

                  </List>
                </Collapse>
              </>
            )}

          </List>
          {/* Phần đẩy nút Logout xuống dưới cùng */}
          <Box sx={{ flexGrow: 1 }} /> {/* Chiếm hết không gian còn lại */}
          {/* Nút Logout */}
          <List>
            <Divider />

            {/* Providers - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <ListItemButton onClick={() => navigate("/products_page")}>
                <ListItemIcon>
                  <BusinessCenter />
                </ListItemIcon>
                <ListItemText primary="Giao diện sản phẩm khách hàng" />
              </ListItemButton>
            )}

            {/* Settings - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/settings")}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Cài đặt" />
            </ListItemButton>
            <Divider />
            {/* Nút Logout */}
            <ListItemButton onClick={handleLogoutClick}>
              <ListItemIcon>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Hộp thoại xác nhận đăng xuất */}
      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle>Xác nhận đăng xuất</DialogTitle>
        <DialogContent>Bạn có chắc chắn muốn đăng xuất không?</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogoutDialog} color="primary">
            Hủy
          </Button>
          <Button onClick={handleConfirmLogout} color="primary" autoFocus>
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
