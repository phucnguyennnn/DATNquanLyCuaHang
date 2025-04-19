import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppRouter from "./routes/Routes";

const AppWrapper = () => {
  const [key, setKey] = useState(0);

  // Lắng nghe sự kiện thay đổi localStorage (trong cùng tab)
  React.useEffect(() => {
    const handleStorageChange = (event) => {
      // Kiểm tra nếu thay đổi liên quan đến một key cụ thể
      if (event.key) {
        setKey((prev) => prev + 1);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <AppRouter key={key} />;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
