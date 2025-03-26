import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import { Logout, AccountCircle } from "@mui/icons-material";

const Navbar = ({ onLogout }) => {
    return (
        <AppBar position="sticky" sx={{ backgroundColor: "#1976d2" }}>
            <Toolbar>
                {/* Tên Dashboard */}
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Admin 111
                </Typography>

                {/* Hiển thị tên người dùng */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <AccountCircle />
                    <Typography variant="body1">Hello, Admin</Typography>

                    {/* Nút Đăng Xuất */}
                    <IconButton color="inherit" onClick={onLogout}>
                        <Logout />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
