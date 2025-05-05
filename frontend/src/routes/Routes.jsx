import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Page404 from "../pages/Notfound404";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import MainLayout from "../layouts/MainLayout"; // Layout chứa Sidebar
import HomePage from "../pages/HomePage";
import ProductManager from "../pages/ProductManager";
import ProductsPage from "../pages/ProductsPage";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import User from "../pages/User";
import PurchaseOrder from "../pages/PurchaseOrder";
import GoodReceipt from "../pages/GoodReceipt";
import AddToInventoy from "../pages/AddToInventory";
import ProductPage from "../pages/ProductsPage";
import CartPage from "../pages/Cart";
import CategoryPage from "../pages/CategoryPage";
import SupplierPage from "../pages/SupplierPage";
import VerifyOTPPage from "../pages/VerifyOTPPage";
import VerifyResetOTPPage from "../pages/VerifyResetOTP";
import SalesPage from "../pages/SalesPage";
import BatchPage from "../pages/BatchPage";


const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => !!localStorage.getItem("authToken"));

  React.useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem("authToken"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return isLoggedIn;
};


const AppRouter = () => {
  const isLoggedIn = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="verify-otp" element={<VerifyOTPPage />} />
        <Route path="verify-reset-otp" element={<VerifyResetOTPPage />} />
        <Route path="products_page" element={<ProductPage />} />
        {/* Protected routes with layout */}
        <Route
          path="/"
          element={isLoggedIn ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<HomePage />} />
          <Route path="homepage" element={<HomePage />} />
          <Route path="products_manager" element={<ProductManager />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="suppliers" element={<SupplierPage />} />
          <Route path="users" element={<User />} />
          <Route path="inventory/purchase-order" element={<PurchaseOrder />} />
          <Route path="inventory/receipt" element={<GoodReceipt />} />
          <Route path="inventory/add-shipment" element={<AddToInventoy />} />
          <Route path="cart_page" element={<CartPage />} />
          <Route path="categories" element={<CategoryPage />} />
          <Route path="products_page" element={<ProductsPage />} />
          <Route path="Sales_page" element={<SalesPage />} />
          <Route path="Batchs_page" element={<BatchPage/>} />
        </Route>
        
        {/* 404 page */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;