import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import ProductGrid from "../components/ProductGrid/ProductGrid";
import Catenogy from "../components/Catenogy/Catenogy";
import EventList from "../components/Events/EventList";
import LaptopUser from "../components/Newlaptop/LaptopUser";
import Sevicer from "../components/Sevicer/Sevicer";
import FooterUser from "../components/Footer/FooterUser";
// import GameModal from "../components/GameTitle/GameModal"; // Import component rời
import "./Home.css";
import ShowroomSystem from "./ShowroomSystem";
import IntroVideoModal from "../components/IntroVideo/IntroVideoModal";

const Home = () => {
  const navigate = useNavigate();

  const [laptopUser, setLaptopUser] = useState([]);
  const [eventList, setEventList] = useState([]);
  const [products, setProducts] = useState([]);
  const [catenogies, setCatenogies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [footer, setFooter] = useState([]);

  // State điều khiển Modal
  const [showGameModal, setShowGameModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, catenogiesRes, eventListRes, laptopRes] =
          await Promise.all([
            fetch("http://localhost:3000/products"),
            fetch("http://localhost:3000/catenogies"),
            fetch("http://localhost:3000/eventList"),
            fetch("http://localhost:3000/LaptopUser"),
          ]);

        setProducts(await productsRes.json());
        setCatenogies(await catenogiesRes.json());
        setEventList(await eventListRes.json());
        setLaptopUser(await laptopRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenGameModal = (id) => {
    setSelectedProductId(id);
    setShowGameModal(true);
  };

  const handleConfirmGame = () => {
    setShowGameModal(false);
    navigate(`/page/${selectedProductId}`);
  };
  useEffect(() => {
    if (showGameModal) {
      // Khi Modal hiện: khóa scroll
      document.body.style.overflow = "hidden";
    } else {
      // Khi Modal tắt: trả lại quyền scroll
      document.body.style.overflow = "unset";
    }

    // Cleanup: Đảm bảo khi component Home bị hủy thì body phải scroll lại bình thường
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showGameModal]); // Chỉ chạy lại khi showGameModal thay đổi

  return (
    <div className="home-page">
      <IntroVideoModal />
      <Header />

      {/* Gọi Component Modal tách rời ở đây */}
      {/* <GameModal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        onConfirm={handleConfirmGame}
      /> */}
      <div className="layout">
        <Sidebar />
        <main className="main-content">
          <div id="pc-gaming">
            <ProductGrid
              products={products}
              onCardClick={handleOpenGameModal}
            />
          </div>
        </main>
      </div>

      <div id="PC-gaming">{""}</div>
      <div id="PC-van-phong">{""}</div>
      <div id="PC-do-hoa">{""}</div>
      <div>
        <Catenogy catenogies={catenogies} />
      </div>

      <div id="LapTop-new">{""}</div>
      <div id="LapTop-van-phong">{""}</div>
      <div id="LapTop-gia-uu-dai">{""}</div>
      <div>
        <LaptopUser laptopData={laptopUser} />
      </div>

      <div id="cpu-section"> {/* Nội dung CPU */} </div>
      <div id="gpu-section"> {/* Nội dung GPU */} </div>
      <div id="ram-section"> {/* Nội dung RAM */} </div>
      <div id="ssd-section"> {/* Nội dung SSD */} </div>
      <div id="card-section"> {/* Nội dung SSD */} </div>
      <div id="mainboard-section"> {/* Nội dung Mainboard */} </div>
      <div id="event-list">
        <EventList eventList={eventList} />
      </div>
      <Sevicer />
      <ShowroomSystem />

      <div id="dich-vu"> {/* Nội dung SSD */} </div>
      <div id="chi-tiet"> {/* Nội dung SSD */} </div>
      <div>
        <FooterUser footer={footer} />
      </div>
    </div>
  );
};

export default Home;
