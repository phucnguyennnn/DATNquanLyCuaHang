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
  Box,
  useTheme,
} from "@mui/material";
import {
  Home as HomeIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Warehouse as WarehouseIcon,
  ExpandLess,
  ExpandMore,
  Description as DescriptionIcon,
  AddBox as AddBoxIcon,
  Inventory as InventoryIcon,
  RecentActors as RecentActorsIcon,
  BusinessCenter as BusinessCenterIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openInventory, setOpenInventory] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const theme = useTheme(); // Sử dụng theme của Material UI

  const role = localStorage.getItem("userRole");

  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;
  const activeColor = theme.palette.primary.light;
  const hoverColor = theme.palette.action.hover;
  const textColor = theme.palette.text.primary;
  const iconColor = theme.palette.primary.contrastText; // Màu chữ/icon trên màu primary
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

  const isPathActive = (path) => {
    return location.pathname === path;
  };

  const isPathPrefixActive = (prefix) => {
    return location.pathname.startsWith(prefix);
  };

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            background: primaryColor, // Màu nền chính của Drawer
            color: iconColor, // Màu chữ/icon trên nền chính
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <List>
            <ListItemButton
              onClick={() => navigate("/homepage")}
              sx={{
                backgroundColor: isPathActive("/homepage")
                  ? activeColor
                  : "transparent",
                color: iconColor,
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemIcon sx={{ color: iconColor }}>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Trang chủ" />
            </ListItemButton>

            <ListItemButton
              onClick={() => navigate("/products_manager")}
              sx={{
                backgroundColor: isPathActive("/products_manager")
                  ? activeColor
                  : "transparent",
                color: iconColor,
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemIcon sx={{ color: iconColor }}>
                <ShoppingCartIcon />
              </ListItemIcon>
              <ListItemText primary="Quản lý sản phẩm" />
            </ListItemButton>

            {(role === "admin" || role === "employee") && (
              <>
                <ListItemButton
                  onClick={() => setOpenInventory(!openInventory)}
                  sx={{
                    backgroundColor: isPathPrefixActive("/inventory")
                      ? activeColor
                      : "transparent",
                    color: iconColor,
                    "&:hover": {
                      backgroundColor: hoverColor,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: iconColor }}>
                    <WarehouseIcon />
                  </ListItemIcon>
                  <ListItemText primary="Kho hàng" />
                  {openInventory ? (
                    <ExpandLess sx={{ color: iconColor }} />
                  ) : (
                    <ExpandMore sx={{ color: iconColor }} />
                  )}
                </ListItemButton>

                <Collapse
                  in={openInventory}
                  timeout="auto"
                  unmountOnExit
                  sx={{ backgroundColor: primaryColor }}
                >
                  <List component="div" disablePadding>
                    <ListItemButton
                      sx={{
                        pl: 4,
                        backgroundColor: isPathActive(
                          "/inventory/purchase-order"
                        )
                          ? activeColor
                          : "transparent",
                        color: iconColor,
                        "&:hover": {
                          backgroundColor: hoverColor,
                        },
                      }}
                      onClick={() => navigate("/inventory/purchase-order")}
                    >
                      <ListItemIcon sx={{ color: iconColor }}>
                        <DescriptionIcon />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu đặt hàng" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{
                        pl: 4,
                        backgroundColor: isPathActive("/inventory/receipt")
                          ? activeColor
                          : "transparent",
                        color: iconColor,
                        "&:hover": {
                          backgroundColor: hoverColor,
                        },
                      }}
                      onClick={() => navigate("/inventory/receipt")}
                    >
                      <ListItemIcon sx={{ color: iconColor }}>
                        <InventoryIcon />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu nhập kho" />
                    </ListItemButton>
                    <ListItemButton
                      sx={{
                        pl: 4,
                        backgroundColor: isPathActive("/inventory/add-shipment")
                          ? activeColor
                          : "transparent",
                        color: iconColor,
                        "&:hover": {
                          backgroundColor: hoverColor,
                        },
                      }}
                      onClick={() => navigate("/inventory/add-shipment")}
                    >
                      <ListItemIcon sx={{ color: iconColor }}>
                        <AddBoxIcon />
                      </ListItemIcon>
                      <ListItemText primary="Thêm lô hàng" />
                    </ListItemButton>
                  </List>
                </Collapse>
              </>
            )}
            {/* 
            {role === "admin" && (
              <ListItemButton
                onClick={() => navigate("/products_page")}
                sx={{
                  backgroundColor: isPathActive("/products_page") ? activeColor : "transparent",
                  color: iconColor,
                  "&:hover": {
                    backgroundColor: hoverColor,
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconColor }}>
                  <BusinessCenterIcon />
                </ListItemIcon>
                <ListItemText primary="Giao diện sản phẩm khách hàng" />
              </ListItemButton>
            )} */}

            {role === "admin" && (
              <ListItemButton
                onClick={() => navigate("/categories")}
                sx={{
                  backgroundColor: isPathActive("/categories")
                    ? activeColor
                    : "transparent",
                  color: iconColor,
                  "&:hover": {
                    backgroundColor: hoverColor,
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconColor }}>
                  <RecentActorsIcon />
                </ListItemIcon>
                <ListItemText primary="Danh mục hàng hóa" />
              </ListItemButton>
            )}
            {role === "admin" && (
              <ListItemButton
                onClick={() => navigate("/suppliers")}
                sx={{
                  backgroundColor: isPathActive("/suppliers")
                    ? activeColor
                    : "transparent",
                  color: iconColor,
                  "&:hover": {
                    backgroundColor: hoverColor,
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconColor }}>
                  <RecentActorsIcon />
                </ListItemIcon>
                <ListItemText primary="Nhà cung cấp" />
              </ListItemButton>
            )}
            {role === "admin" && (
              <ListItemButton
                onClick={() => navigate("/users")}
                sx={{
                  backgroundColor: isPathActive("/users")
                    ? activeColor
                    : "transparent",
                  color: iconColor,
                  "&:hover": {
                    backgroundColor: hoverColor,
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconColor }}>
                  <RecentActorsIcon />
                </ListItemIcon>
                <ListItemText primary="Nhân viên" />
              </ListItemButton>
            )}

            <ListItemButton
              onClick={() => navigate("/settings")}
              sx={{
                backgroundColor: isPathActive("/settings")
                  ? activeColor
                  : "transparent",
                color: iconColor,
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemIcon sx={{ color: iconColor }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Cài đặt" />
            </ListItemButton>

            <ListItemButton
              onClick={() => navigate("/profile")}
              sx={{
                backgroundColor: isPathActive("/profile")
                  ? activeColor
                  : "transparent",
                color: iconColor,
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemIcon sx={{ color: iconColor }}>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Hồ sơ" />
            </ListItemButton>
          </List>
          <Box sx={{ flexGrow: 1 }} />
          <List>
            <Divider sx={{ backgroundColor: theme.palette.divider }} />
            <ListItemButton
              onClick={handleLogoutClick}
              sx={{
                color: iconColor,
                "&:hover": {
                  backgroundColor: hoverColor,
                },
              }}
            >
              <ListItemIcon sx={{ color: iconColor }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle color={textColor}>Xác nhận đăng xuất</DialogTitle>
        <DialogContent color={textColor}>
          Bạn có chắc chắn muốn đăng xuất không?
        </DialogContent>
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
