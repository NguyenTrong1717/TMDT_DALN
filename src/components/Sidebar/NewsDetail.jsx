import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import FooterUser from "../../components/Footer/FooterUser";
import Sevicer from "../../components/Sevicer/Sevicer";
import "./NewsDetail.css";

const NewsDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3000/news")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((item) => String(item.id) === String(id));
        setArticle(found || null);
        setRelated(
          data.filter((item) => String(item.id) !== String(id)).slice(0, 4),
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi fetch news detail:", err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="nd-loading">Đang tải bài viết...</div>
        <FooterUser />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Header />
        <div className="nd-notfound">
          <h2>Bài viết không tồn tại</h2>
          <Link to="/news">← Quay lại tin tức</Link>
        </div>
        <FooterUser />
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="demo-bar">
        <div className="demo-bread">
          <Link to="/">
            <span>Trang chủ</span>
          </Link>
          <Link to="/news">
            <span>Tin Tức</span>
          </Link>
          <span className="demo-bread-current">{article.title}</span>
        </div>
      </div>

      <div className="nd-page">
        <div className="nd-container">
          <div className="nd-layout">
            {/* ── MAIN ARTICLE ── */}
            <article className="nd-article">
              <div
                className={`nd-article__banner nd-article__banner--${article.color || "blue"}`}
              >
                <img
                  src={
                    article.thumbnail ||
                    article.image ||
                    "/images/default-news.jpg"
                  }
                  alt={article.title}
                  onError={(e) => {
                    e.target.src = "/images/default-news.jpg";
                  }}
                />
              </div>

              <div className="nd-article__body">
                <div className="nd-article__meta">
                  <span
                    className={`nd-badge nd-badge--${article.categorySlug || "tech"}`}
                  >
                    {article.category}
                  </span>
                  <span className="nd-article__date">
                    {new Date(article.date).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="nd-article__views">
                    {article.views?.toLocaleString()} lượt xem
                  </span>
                </div>

                <h1 className="nd-article__title">{article.title}</h1>
                <p className="nd-article__lead">{article.desc}</p>

                <div className="nd-article__divider" />

                <div className="nd-article__content">
                  {article.content
                    ?.split("\n")
                    .map((para, i) =>
                      para.trim() ? <p key={i}>{para.trim()}</p> : null,
                    )}
                </div>

                <div className="nd-article__footer">
                  <Link to="/news" className="nd-back-btn">
                    ← Quay lại tin tức
                  </Link>
                  <div className="nd-article__share">
                    <span>Chia sẻ:</span>
                    <button className="nd-share-btn">Facebook</button>
                    <button className="nd-share-btn">Zalo</button>
                  </div>
                </div>
              </div>
            </article>

            {/* ── SIDEBAR ── */}
            <aside className="nd-sidebar">
              <div className="nd-sidebar__box">
                <h3 className="nd-sidebar__title">Bài viết liên quan</h3>
                <div className="nd-related">
                  {related.map((item) => (
                    <Link
                      to={`/news/${item.id}`}
                      key={item.id}
                      className="nd-related__card"
                    >
                      <div
                        className={`nd-related__img nd-related__img--${item.color || "blue"}`}
                      >
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} />
                        ) : (
                          <span>{item.category}</span>
                        )}
                      </div>
                      <div className="nd-related__info">
                        <span
                          className={`nd-badge nd-badge--${item.categorySlug || "tech"}`}
                        >
                          {item.category}
                        </span>
                        <p className="nd-related__title">{item.title}</p>
                        <span className="nd-related__date">
                          {new Date(item.date).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Sevicer />
      <FooterUser />
    </>
  );
};

export default NewsDetail;
