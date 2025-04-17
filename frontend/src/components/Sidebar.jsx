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
    IconButton,
    AppBar,
    Toolbar,
    Typography,
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
    Menu as MenuIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useMediaQuery from "@mui/material/useMediaQuery";

const drawerWidth = 240;

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [openInventory, setOpenInventory] = useState(false);
    const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Sử dụng breakpoint md trở xuống cho mobile
    const role = localStorage.getItem("userRole");

    const primaryColor = theme.palette.primary.main;
    const secondaryColor = theme.palette.secondary.main;
    const activeColor = theme.palette.primary.light;
    const hoverColor = theme.palette.action.hover;
    const textColor = theme.palette.text.primary;
    const iconColor = theme.palette.primary.contrastText;

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

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
        console.log("Nút đăng xuất đã được nhấp!");
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

    const drawerContent = (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: primaryColor,
                color: iconColor,
            }}
        >
            <List>
                <ListItemButton
                    onClick={() => navigate("/homepage")}
                    sx={{
                        backgroundColor: isPathActive("/homepage") ? activeColor : "transparent",
                        color: iconColor,
                        "&:hover": { backgroundColor: hoverColor },
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
                        backgroundColor: isPathActive("/products_manager") ? activeColor : "transparent",
                        color: iconColor,
                        "&:hover": { backgroundColor: hoverColor },
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
                                backgroundColor: isPathPrefixActive("/inventory") ? activeColor : "transparent",
                                color: iconColor,
                                "&:hover": { backgroundColor: hoverColor },
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
                                        backgroundColor: isPathActive("/inventory/purchase-order") ? activeColor : "transparent",
                                        color: iconColor,
                                        "&:hover": { backgroundColor: hoverColor },
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
                                        backgroundColor: isPathActive("/inventory/receipt") ? activeColor : "transparent",
                                        color: iconColor,
                                        "&:hover": { backgroundColor: hoverColor },
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
                                        backgroundColor: isPathActive("/inventory/add-shipment") ? activeColor : "transparent",
                                        color: iconColor,
                                        "&:hover": { backgroundColor: hoverColor },
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

                {role === "admin" && (
                    <>
                        <ListItemButton
                            onClick={() => navigate("/categories")}
                            sx={{
                                backgroundColor: isPathActive("/categories") ? activeColor : "transparent",
                                color: iconColor,
                                "&:hover": { backgroundColor: hoverColor },
                            }}
                        >
                            <ListItemIcon sx={{ color: iconColor }}>
                                <RecentActorsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Danh mục hàng hóa" />
                        </ListItemButton>
                        <ListItemButton
                            onClick={() => navigate("/suppliers")}
                            sx={{
                                backgroundColor: isPathActive("/suppliers") ? activeColor : "transparent",
                                color: iconColor,
                                "&:hover": { backgroundColor: hoverColor },
                            }}
                        >
                            <ListItemIcon sx={{ color: iconColor }}>
                                <RecentActorsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Nhà cung cấp" />
                        </ListItemButton>
                        <ListItemButton
                            onClick={() => navigate("/users")}
                            sx={{
                                backgroundColor: isPathActive("/users") ? activeColor : "transparent",
                                color: iconColor,
                                "&:hover": { backgroundColor: hoverColor },
                            }}
                        >
                            <ListItemIcon sx={{ color: iconColor }}>
                                <RecentActorsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Nhân viên" />
                        </ListItemButton>
                    </>
                )}

                <ListItemButton
                    onClick={() => navigate("/settings")}
                    sx={{
                        backgroundColor: isPathActive("/settings") ? activeColor : "transparent",
                        color: iconColor,
                        "&:hover": { backgroundColor: hoverColor },
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
                        backgroundColor: isPathActive("/profile") ? activeColor : "transparent",
                        color: iconColor,
                        "&:hover": { backgroundColor: hoverColor },
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
                        "&:hover": { backgroundColor: hoverColor },
                    }}
                >
                    <ListItemIcon sx={{ color: iconColor }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Đăng xuất" />
                </ListItemButton>
            </List>
        </Box>
    );

    return (
        <>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    display: { md: 'none' }, // Ẩn AppBar trên màn hình lớn
                    backgroundColor: primaryColor,
                    color: iconColor,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        Ứng dụng quản lý
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
                aria-label="mailbox folders"
            >
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer
                    // Mobile view
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { width: drawerWidth, backgroundColor: primaryColor, color: iconColor },
                    }}
                >
                    {drawerContent}
                </Drawer>
                <Drawer
                    // Desktop view
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', backgroundColor: primaryColor, color: iconColor },
                    }}
                    open
                >
                    <Toolbar sx={{ minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" noWrap sx={{ color: iconColor }}>
                            Quản lý
                        </Typography>
                    </Toolbar>
                    <Divider sx={{ backgroundColor: theme.palette.divider }} />
                    {drawerContent}
                </Drawer>
            </Box>

            <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog} sx={{ '& .MuiDialog-paper': { backgroundColor: primaryColor, color: textColor } }}>
                <DialogTitle color={textColor}>Xác nhận đăng xuất</DialogTitle>
                <DialogContent color={textColor}>
                    Bạn có chắc chắn muốn đăng xuất không?
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLogoutDialog} color="black">
                        Hủy
                    </Button>
                    <Button onClick={handleConfirmLogout} color="black" autoFocus>
                        Đăng xuất
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Sidebar;