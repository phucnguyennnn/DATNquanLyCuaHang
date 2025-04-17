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
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import Supplier from "../pages/SupplierPage";
import User from "../pages/User";
import PurchaseOrder from "../pages/PurchaseOrder";
import GoodReceipt from "../pages/GoodReceipt";
import AddToInventoy from "../pages/AddToInventory";
import Cart from "../pages/Cart";
import ProductPage from "../pages/ProductsPage";
import CartPage from "../pages/Cart";
import Category from "../pages/CategoryPage"; 
import SalesPage from "../pages/SalesPage";


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
        
        {/* Protected routes with layout */}
        <Route
          path="/"
          element={isLoggedIn ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<HomePage />} />
          <Route path="homepage" element={<HomePage />} />
          <Route path="products_manager" element={<ProductManager />} />
          <Route path="products_page" element={<ProductPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="supplier" element={<Supplier />} />
          <Route path="users" element={<User />} />
          <Route path="inventory/purchase-order" element={<PurchaseOrder />} />
          <Route path="inventory/receipt" element={<GoodReceipt />} />
          <Route path="inventory/add-shipment" element={<AddToInventoy />} />
          <Route path="cart_page" element={<CartPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="categorie" element={<Category />} />
          <Route path="sales" element={<SalesPage />} />
          
        </Route>
        
        {/* 404 page */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;