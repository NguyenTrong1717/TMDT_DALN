import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import NProgress from "nprogress";
import "./LoadingBar.css";

const LoadingBar = () => {
  const location = useLocation();

  useEffect(() => {
    // chỉ trigger khi đổi route
    NProgress.start();

    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default LoadingBar;
