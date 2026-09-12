import "./ProductGrid.css";
import ProductCard from "../ProductCard/ProductCard";

// 1. Nhận thêm prop onCardClick từ Home.jsx truyền xuống
const ProductGrid = ({ products, onCardClick }) => {
  return (
    <div className="product-grid">
      {products.map((item) => (
        //2. Truyền tiếp onCardClick xuống cho từng thẻ ProductCard con
        <ProductCard key={item.id} product={item} onCardClick={onCardClick} />
      ))}
    </div>
  );
};

export default ProductGrid;
