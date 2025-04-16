import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppRouter from "./routes/Routes";

const AppWrapper = () => {
  const [key, setKey] = useState(0);

  // Lắng nghe sự kiện thay đổi localStorage (trong cùng tab)
  window.addEventListener("storage", () => {
    setKey((prev) => prev + 1);
  });

  return <AppRouter key={key} />;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
);
