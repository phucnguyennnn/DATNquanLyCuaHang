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
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const [openInventory, setOpenInventory] = useState(false);
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
              <ListItemText primary="Home" />
            </ListItemButton>

            {/* Products - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/products")}>
              <ListItemIcon>
                <ShoppingCart />
              </ListItemIcon>
              <ListItemText primary="Products" />
            </ListItemButton>

            {/* Inventory và các mục con - Hiển thị cho admin và staff */}
            {(role === "admin" || role === "staff") && (
              <>
                <ListItemButton onClick={() => setOpenInventory(!openInventory)}>
                  <ListItemIcon>
                    <Warehouse />
                  </ListItemIcon>
                  <ListItemText primary="Inventory" />
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
                    <ListItemButton
                      sx={{ pl: 4 }}
                      onClick={() => navigate("/inventory/add-shipment")}
                    >
                      <ListItemIcon>
                        <AddBox />
                      </ListItemIcon>
                      <ListItemText primary="Thêm lô hàng" />
                    </ListItemButton>
                  </List>
                </Collapse>
              </>
            )}

            {/* Providers - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <ListItemButton onClick={() => navigate("/provider")}>
                <ListItemIcon>
                  <BusinessCenter />
                </ListItemIcon>
                <ListItemText primary="Providers" />
              </ListItemButton>
            )}

            {/* List User - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <ListItemButton onClick={() => navigate("/users")}>
                <ListItemIcon>
                  <RecentActors />
                </ListItemIcon>
                <ListItemText primary="List User" />
              </ListItemButton>
            )}

            {/* Settings - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/settings")}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>

            {/* Profile - Hiển thị cho tất cả các role */}
            <ListItemButton onClick={() => navigate("/profile")}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItemButton>
          </List>

          {/* Phần đẩy nút Logout xuống dưới cùng */}
          <Box sx={{ flexGrow: 1 }} /> {/* Chiếm hết không gian còn lại */}

          {/* Nút Logout */}
          <List>
            <Divider />
            <ListItemButton onClick={handleLogoutClick}>
              <ListItemIcon>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Logout" />
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