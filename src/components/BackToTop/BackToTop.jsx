import { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";
import "./BackToTop.css";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 280);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top-btn"
      onClick={scrollToTop}
      title="Quay lại đầu trang"
      aria-label="Quay lại đầu trang"
    >
      <FaArrowUp className="back-to-top-icon" />
      <span className="back-to-top-text">Lên đầu</span>
    </button>
  );
};

export default BackToTop;
