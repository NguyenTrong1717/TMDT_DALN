import { useState, useEffect, useRef } from "react";
import { FaTimes, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import "./IntroVideoModal.css";

const VIDEO_SRC = "/images/video4.mp4";
const ALWAYS_SHOW = false;

const SESSION_KEY = "introVideoShown";

const IntroVideoModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (ALWAYS_SHOW || !alreadyShown) {
      setIsOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, []);

  // Khóa scroll nền khi popup đang mở, giống các modal khác trong dự án
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="intro-video-overlay" onClick={handleClose}>
      <div
        className="intro-video-box"
        onClick={(e) => e.stopPropagation()} // chặn click trong box làm đóng modal
      >
        <button className="intro-video-close-btn" onClick={handleClose}>
          <FaTimes />
        </button>

        <div className="intro-video-wrapper">
          {!videoError ? (
            <video
              ref={videoRef}
              className="intro-video-player"
              src={VIDEO_SRC}
              autoPlay
              muted={isMuted}
              controls
              playsInline
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="intro-video-placeholder">
              <p>🎬 Chưa có video giới thiệu sản phẩm.</p>
              <p className="intro-video-placeholder-sub">
                Thêm file video vào <code>public/videos/intro-demo.mp4</code> để
                hiển thị tại đây.
              </p>
            </div>
          )}

          {!videoError && (
            <button className="intro-video-mute-btn" onClick={toggleMute}>
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
          )}
        </div>

        <div className="intro-video-caption">
          Video giới thiệu sản phẩm — bấm dấu X để đóng
        </div>
      </div>
    </div>
  );
};

export default IntroVideoModal;
