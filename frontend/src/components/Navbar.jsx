import React, { useState } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from "@mui/material";
import { Logout, AccountCircle } from "@mui/icons-material";

const Navbar = ({ onLogout }) => {
    const [openDialog, setOpenDialog] = useState(false);

    const handleLogoutClick = () => {
        setOpenDialog(true); // Mở hộp thoại xác nhận
    };

    const handleConfirmLogout = () => {
        setOpenDialog(false);
        onLogout(); // Gọi hàm đăng xuất từ props
    };

    const handleCancelLogout = () => {
        setOpenDialog(false); // Đóng dialog nếu người dùng chọn không
    };

    return (
        <>
            <AppBar position="sticky" sx={{ backgroundColor: "#1976d2" }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Greating
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <AccountCircle />
                        <Typography variant="body1">Hello, username</Typography>

                        {/* <IconButton color="inherit" onClick={handleLogoutClick}>
                            <Logout />
                        </IconButton> */}
                    </Box>
                </Toolbar>
            </AppBar>

            <Dialog open={openDialog} onClose={handleCancelLogout}>
                <DialogTitle>Confirm log out?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure want to log out?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelLogout} color="inherit">
                        cancel
                    </Button>
                    <Button onClick={handleConfirmLogout} color="error" autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Navbar;
