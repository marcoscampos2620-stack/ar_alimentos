import React from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';

interface Product {
  id: string;
  name: string;
  price: number;
  unit_type: string;
  image_url?: string;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const initials = product.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button className="pos-product-card card shadow-sm" onClick={onClick}>
      <div className="img-container">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <div className="initials">{initials}</div>
        )}
      </div>
      <div className="info">
        <span className="name">{product.name}</span>
        <span className="price">{formatCurrency(product.price)} / <small>{product.unit_type}</small></span>
      </div>

      <style>{`
        .pos-product-card {
          display: flex;
          flex-direction: column;
          padding: 8px;
          gap: 10px;
          text-align: left;
          transition: transform 0.2s;
          border: 1px solid transparent;
        }
        .pos-product-card:hover { transform: translateY(-3px); border-color: var(--primary); }
        .img-container {
          width: 100%;
          aspect-ratio: 1;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .img-container img { width: 100%; height: 100%; object-fit: cover; }
        .initials { font-size: 1.5rem; font-weight: 800; color: var(--primary); opacity: 0.6; }
        .info { display: flex; flex-direction: column; gap: 2px; }
        .info .name { font-weight: 600; color: var(--text-main); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .info .price { font-weight: 800; color: var(--primary); font-size: 0.95rem; }
        .info .price small { font-weight: 600; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
      `}</style>
    </button>
  );
};

export default ProductCard;
