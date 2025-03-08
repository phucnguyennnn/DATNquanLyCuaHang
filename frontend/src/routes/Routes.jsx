import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import App from "../App";
import Dashboard from "../pages/Dashboard";
import Page404 from "../pages/Notfound404";
const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkLogin = () => {
      const authToken = localStorage.getItem("authToken");
      setIsLoggedIn(!!authToken);
    };
    checkLogin();
  }, []);

  return isLoggedIn;
};

const AppRouter = () => {
  const isLoggedIn = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="*" element={<App />} />
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <App />}
        />
        <Route path="/dashboard/*" element={<Dashboard />} />
        {/* <Route path="/dashboard/*" element={isLoggedIn ? <Dashboard/> : <Navigate to="/" />} /> */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
