import React, { useState, useEffect } from "react";
import {Drawer,List,ListItem,ListItemButton,ListItemIcon,ListItemText,Divider,Collapse,} from "@mui/material";
import {Home,ShoppingCart,Settings,AccountCircle,Logout,Warehouse,ExpandLess,ExpandMore,Description,AddBox,Inventory,RecentActors} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const drawerWidth = 240;

const Sidebar = () => {
  const navigate = useNavigate();
  const [openInventory, setOpenInventory] = useState(false);

  const isAdmin = localStorage.getItem("isAdmin") === "true" || false;

 const handleLogout = async () => {
  try {
    const token = localStorage.getItem("authToken");

    // Kiểm tra token
    if (token) {
      console.log("tìm thấy token", token);
      navigate("/login");
    }else{
      console.log("Không tìm thấy Token: ");
    }

    // Gửi yêu cầu logout
    const response = await axios.post(
      "http://localhost:8000/api/auth/logout",
      {},
      {
        headers: {
          token: `Bearer ${token}`,
          // "X-CSRF-TOKEN": csrfToken, // Bỏ comment nếu cần gửi CSRF token
        },
        withCredentials: true, 
      }
    );

    if (response.status === 200) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userID");
      localStorage.removeItem("isAdmin");
      console.log("Đăng xuất thành công!");
      navigate("/login");
    } else {
      console.error("Đăng xuất thất bại với mã lỗi:", response.status);
    }
  } catch (error) {
    
    console.error("Lỗi đăng xuất:", error.response?.data || error.message);

    if (error.response?.status === 403) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userID");
      localStorage.removeItem("isAdmin");
      navigate("/login");
    }
  }
};

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
      }}
      variant="permanent"
      anchor="left"
    >
      <List>
        {/* Home */}
        <ListItemButton onClick={() => navigate("/home")}>
          <ListItemIcon>
            <Home />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>

        {/* Products */}
        <ListItemButton onClick={() => navigate("/products")}>
          <ListItemIcon>
            <ShoppingCart />
          </ListItemIcon>
          <ListItemText primary="Products" />
        </ListItemButton>

        {/* Inventory - Menu chính */}
        <ListItemButton onClick={() => setOpenInventory(!openInventory)}>
          <ListItemIcon>
            <Warehouse />
          </ListItemIcon>
          <ListItemText primary="Inventory" />
          {openInventory ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        {/* Inventory - Menu con */}
        <Collapse in={openInventory} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate("/dashboard")}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText primary="Tạo phiếu đặt hàng" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate("/inventory/add-shipment")}>
              <ListItemIcon>
                <AddBox />
              </ListItemIcon>
              <ListItemText primary="Thêm lô hàng" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => navigate("/inventory/receipt")}>
              <ListItemIcon>
                <Inventory />
              </ListItemIcon>
              <ListItemText primary="Tạo phiếu nhập kho" />
            </ListItemButton>
          </List>
        </Collapse>
      {/* list user */}
      {isAdmin && (
          <ListItemButton onClick={() => navigate("/users")}>
            <ListItemIcon>
              <RecentActors />
            </ListItemIcon>
            <ListItemText primary="List User" />
          </ListItemButton>
        )}
        {/* Settings */}
        <ListItemButton onClick={() => navigate("/settings")}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>

        {/* Profile */}
        <ListItemButton onClick={() => navigate("/profile")}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>

        <Divider />

        {/* Logout */}
        <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;