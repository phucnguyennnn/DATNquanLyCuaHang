import React, { useState, useEffect } from "react";
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
  Typography,
  Avatar,
  useTheme,
  alpha,
  styled,
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
  History as HistoryIcon,
  BarChart, // Thêm icon cho thống kê
  Receipt, // Thêm icon cho báo cáo thu chi
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const drawerWidth = 260;

// Custom styled components for better UI
const StyledListItemButton = styled(ListItemButton)(({ theme, active }) => ({
  margin: "4px 8px",
  borderRadius: "8px",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    "& .MuiListItemIcon-root": {
      color: theme.palette.primary.main,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  }),
}));

const StyledSubListItemButton = styled(ListItemButton)(({ theme, active }) => ({
  margin: "2px 8px",
  paddingLeft: "24px",
  borderRadius: "8px",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    "& .MuiListItemIcon-root": {
      color: theme.palette.primary.main,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  }),
}));

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [openInventory, setOpenInventory] = useState(false);
  const [openDashboard, setOpenDashboard] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [openStockManagement, setOpenStockManagement] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false); // State cho mục Thống kê
  const [localRole, setLocalRole] = useState(localStorage.getItem("userRole"));
  const fullName = localStorage.getItem("fullName") || "Người dùng";

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalRole(localStorage.getItem("userRole"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Re-render Sidebar when the route changes to update the role-based menus
  useEffect(() => {
    setLocalRole(localStorage.getItem("userRole"));
  }, [location.pathname]); // Theo dõi sự thay đổi của location.pathname

  const role = localRole;

  // Function to check if the current path matches
  const isActive = (path) => location.pathname === path;

  // Function to check if the current path starts with a prefix
  const isActiveGroup = (prefix) => location.pathname.startsWith(prefix);

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

  // Nếu là customer, không hiển thị Sidebar
  if (role === "customer") {
    return null;
  }

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            border: "none",
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
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {/* Logo and User Info Section
          <Box
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: `1px solid ${theme.palette.divider}`,
              mb: 1,
              pt: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                mb: 3,
              }}
            >
              STORE MANAGEMENT
            </Typography>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                mb: 1,
                bgcolor: theme.palette.primary.main
              }}
            >
              {fullName.charAt(0)}
            </Avatar>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 'medium',
                color: theme.palette.text.primary,
                mb: 0.5
              }}
            >
              {fullName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'capitalize'
              }}
            >
              {role || 'user'}
            </Typography>
          </Box> */}

          {/* Main Navigation */}
          <List sx={{ p: 1 }}>
            {/* Home - Hiển thị cho tất cả các role */}
            <StyledListItemButton
              onClick={() => navigate("/homepage")}
              active={isActive("/homepage") ? 1 : 0}
            >
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Trang chủ" />
            </StyledListItemButton>

            {/* Bán hàng - Hiển thị cho tất cả các role */}
            <StyledListItemButton
              onClick={() => navigate("/Sales_page")}
              active={isActive("/Sales_page") ? 1 : 0}
            >
              <ListItemIcon>
                <PointOfSale />
              </ListItemIcon>
              <ListItemText primary="Bán hàng" />
            </StyledListItemButton>

            {/* Thống kê và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenStatistics(!openStatistics)}
                  active={isActiveGroup("/statistics") ? 1 : 0}
                >
                  <ListItemIcon>
                    <BarChart />
                  </ListItemIcon>
                  <ListItemText primary="Thống kê" />
                  {openStatistics ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openStatistics} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/statistics/inoutpage")}
                      active={isActive("/statistics/inoutpage") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Receipt />
                      </ListItemIcon>
                      <ListItemText primary="Báo cáo thu chi" />
                    </StyledSubListItemButton>
                    {/* Thêm các mục thống kê khác nếu cần */}
                  </List>
                </Collapse>
              </>
            )}

            {/* Inventory và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenInventory(!openInventory)}
                  active={isActiveGroup("/inventory") ? 1 : 0}
                >
                  <ListItemIcon>
                    <MoveToInbox />
                  </ListItemIcon>
                  <ListItemText primary="Nhập hàng" />
                  {openInventory ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openInventory} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("/inventory/purchase-order")}
                      active={isActive("/inventory/purchase-order") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu đặt hàng" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/inventory/receipt")}
                      active={isActive("/inventory/receipt") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Inventory />
                      </ListItemIcon>
                      <ListItemText primary="Tạo phiếu nhập kho" />
                    </StyledSubListItemButton>
                  </List>
                </Collapse>
              </>
            )}

            {/* Quản lý tồn kho với các menu con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <StyledListItemButton
                onClick={() => setOpenStockManagement(!openStockManagement)}
                active={
                  isActiveGroup("/Batchs_page") ||
                  isActiveGroup("/return-history") ||
                  isActiveGroup("/Inventory-history")
                    ? 1
                    : 0
                }
              >
                <ListItemIcon>
                  <Warehouse />
                </ListItemIcon>
                <ListItemText primary="Quản lý tồn kho" />
                {openStockManagement ? <ExpandLess /> : <ExpandMore />}
              </StyledListItemButton>
            )}

            {role === "admin" && (
              <Collapse in={openStockManagement} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  <StyledSubListItemButton
                    onClick={() => navigate("/Batchs_page")}
                    active={isActive("/Batchs_page") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Inventory />
                    </ListItemIcon>
                    <ListItemText primary="Danh sách tồn kho" />
                  </StyledSubListItemButton>
                  <StyledSubListItemButton
                    onClick={() => navigate("/return-history")}
                    active={isActive("/return-history") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText primary="Lịch sử trả hàng" />
                  </StyledSubListItemButton>
                  <StyledSubListItemButton
                    onClick={() => navigate("/Inventory-history")}
                    active={isActive("/Inventory-history") ? 1 : 0}
                  >
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText primary="Lịch sử nhập kho" />
                  </StyledSubListItemButton>
                </List>
              </Collapse>
            )}

            {/* Quản lý chung và các mục con - Chỉ hiển thị cho admin */}
            {role === "admin" && (
              <>
                <StyledListItemButton
                  onClick={() => setOpenDashboard(!openDashboard)}
                  active={
                    isActiveGroup("/products_manager") ||
                    isActiveGroup("/categories") ||
                    isActiveGroup("/suppliers") ||
                    isActiveGroup("/users") ||
                    isActiveGroup("/profile")
                      ? 1
                      : 0
                  }
                >
                  <ListItemIcon>
                    <DashboardCustomize />
                  </ListItemIcon>
                  <ListItemText primary="Quản lý chung" />
                  {openDashboard ? <ExpandLess /> : <ExpandMore />}
                </StyledListItemButton>

                <Collapse in={openDashboard} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    <StyledSubListItemButton
                      onClick={() => navigate("products_manager")}
                      active={isActive("/products_manager") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Inventory2 />
                      </ListItemIcon>
                      <ListItemText primary="Danh mục sản phẩm" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/categories")}
                      active={isActive("/categories") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Category />
                      </ListItemIcon>
                      <ListItemText primary="Loại sản phẩm" />
                    </StyledSubListItemButton>

                    <StyledSubListItemButton
                      onClick={() => navigate("/suppliers")}
                      active={isActive("/suppliers") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <Handshake />
                      </ListItemIcon>
                      <ListItemText primary="Nhà cung cấp" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/users")}
                      active={isActive("/users") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <RecentActors />
                      </ListItemIcon>
                      <ListItemText primary="Nhân viên" />
                    </StyledSubListItemButton>
                    <StyledSubListItemButton
                      onClick={() => navigate("/profile")}
                      active={isActive("/profile") ? 1 : 0}
                    >
                      <ListItemIcon>
                        <AccountCircle />
                      </ListItemIcon>
                      <ListItemText primary="Hồ sơ" />
                    </StyledSubListItemButton>
                  </List>
                </Collapse>
              </>
            )}
          </List>

          {/* Bottom Section */}
          <Box sx={{ flexGrow: 1 }} />
          <List sx={{ p: 1 }}>
            <StyledListItemButton
              onClick={() => navigate("/settings")}
              active={isActive("/settings") ? 1 : 0}
            >
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Cài đặt" />
            </StyledListItemButton>

            <StyledListItemButton
              onClick={handleLogoutClick}
              sx={{
                color: theme.palette.error.main,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <ListItemIcon sx={{ color: theme.palette.error.main }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Đăng xuất" />
            </StyledListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Hộp thoại xác nhận đăng xuất */}
      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle sx={{ fontWeight: 600 }}>Xác nhận đăng xuất</DialogTitle>
        <DialogContent>Bạn có chắc chắn muốn đăng xuất không?</DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseLogoutDialog} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleConfirmLogout}
            variant="contained"
            color="error"
            autoFocus
          >
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
