import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { MdOutlineDiscount } from "react-icons/md";
import { IoFlashSharp, IoGift } from "react-icons/io5";
import { MdContactMail } from "react-icons/md";

import "./NotificationBell.css";

const API_URL = "http://localhost:3000";
const POLL_INTERVAL = 20000; // 20s — tự làm mới danh sách thông báo

const TYPE_ICON = {
  order: <IoGift />,
  service: <MdContactMail />,
  voucher: <MdOutlineDiscount />,
  flashsale: <IoFlashSharp />,
};

const timeAgo = (isoDate) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const NotificationBell = ({ label }) => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  // Thông báo broadcast (userId: null) không thuộc riêng ai, nên trạng thái "đã đọc"
  // được lưu cục bộ theo từng trình duyệt/tài khoản, không PATCH lên server chung.
  const readBroadcastKey = `readBroadcasts_${currentUser?.id ?? "guest"}`;
  const getReadBroadcastIds = () =>
    JSON.parse(localStorage.getItem(readBroadcastKey) || "[]");

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/notifications`);
      const data = await res.json();
      const readBroadcastIds = getReadBroadcastIds();

      const mine = (Array.isArray(data) ? data : [])
        .filter((n) => n.userId === String(currentUser.id) || n.userId === null)
        .map((n) => ({
          ...n,
          read: n.userId === null ? readBroadcastIds.includes(n.id) : n.read,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(mine);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();

    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    window.addEventListener("notificationsUpdated", fetchNotifications);

    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notificationsUpdated", fetchNotifications);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  if (!currentUser) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markOneAsRead = async (n) => {
    if (n.read) return;
    if (n.userId === null) {
      const ids = getReadBroadcastIds();
      localStorage.setItem(readBroadcastKey, JSON.stringify([...ids, n.id]));
    } else {
      try {
        await fetch(`${API_URL}/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
      } catch (err) {
        console.error("Không thể cập nhật thông báo:", err);
      }
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
    );
  };

  const handleItemClick = (n) => {
    markOneAsRead(n);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    const unread = notifications.filter((n) => !n.read);

    const broadcastIds = unread
      .filter((n) => n.userId === null)
      .map((n) => n.id);
    if (broadcastIds.length > 0) {
      const ids = getReadBroadcastIds();
      localStorage.setItem(
        readBroadcastKey,
        JSON.stringify([...new Set([...ids, ...broadcastIds])]),
      );
    }

    const personal = unread.filter((n) => n.userId !== null);
    await Promise.all(
      personal.map((n) =>
        fetch(`${API_URL}/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        }).catch(() => {}),
      ),
    );

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="notif-bell" ref={wrapperRef}>
      <button
        className="notif-bell__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label="Thông báo"
      >
        <span className="notif-bell__icon-wrap">
          <FaBell />
          {unreadCount > 0 && (
            <span className="notif-bell__badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {label && <span className="notif-bell__label">{label}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel" onClick={(e) => e.stopPropagation()}>
          <div className="notif-bell__panel-header">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <button
                className="notif-bell__mark-all"
                onClick={handleMarkAllRead}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="notif-bell__list">
            {notifications.length === 0 ? (
              <div className="notif-bell__empty">
                Bạn chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-bell__item ${n.read ? "" : "unread"}`}
                  onClick={() => handleItemClick(n)}
                >
                  {n.image ? (
                    <div className="notif-bell__thumb">
                      <img
                        src={n.image}
                        alt={n.title}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement.classList.add(
                            "notif-bell__thumb--fallback",
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`notif-bell__icon notif-bell__icon--${n.type}`}
                    >
                      {TYPE_ICON[n.type] || <FaBell />}
                    </div>
                  )}
                  <div className="notif-bell__content">
                    <div className="notif-bell__title">{n.title}</div>
                    <div className="notif-bell__message">{n.message}</div>
                    <div className="notif-bell__time">
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && <span className="notif-bell__dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
