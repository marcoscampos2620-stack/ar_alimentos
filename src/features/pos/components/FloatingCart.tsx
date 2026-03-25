import React from 'react';
import { ShoppingCart, ChevronUp } from 'lucide-react';

interface FloatingCartProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

const FloatingCart: React.FC<FloatingCartProps> = ({ itemCount, total, onClick }) => {
  if (itemCount === 0) return null;

  return (
    <div className="floating-cart-container fade-in-up">
      <button className="floating-cart-btn shadow-lg" onClick={onClick}>
        <div className="cart-left">
          <div className="cart-badge">{itemCount}</div>
          <ShoppingCart size={24} />
          <div className="cart-info">
            <span className="label">Ver Carrinho</span>
            <span className="total">R$ {total.toFixed(2)}</span>
          </div>
        </div>
        <ChevronUp size={20} />
      </button>

      <style>{`
        .floating-cart-container {
          position: fixed;
          bottom: 110px;
          left: 50%;
          transform: translateX(-50%) !important;
          width: 90%;
          max-width: 500px;
          z-index: 9999;
        }
        .floating-cart-btn {
          width: 100%;
          background: var(--primary);
          color: white;
          padding: 12px 20px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: none;
          transition: transform 0.2s;
        }
        .floating-cart-btn:active { transform: scale(0.98); }
        .cart-left { display: flex; align-items: center; gap: 16px; }
        .cart-badge {
          background: white;
          color: var(--primary);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
          position: absolute;
          top: -8px;
          left: 36px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .cart-info { display: flex; flex-direction: column; align-items: flex-start; }
        .cart-info .label { font-size: 0.75rem; opacity: 0.9; font-weight: 600; }
        .cart-info .total { font-size: 1.1rem; font-weight: 800; }

        @keyframes fadeInUpSimple {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .fade-in-up { animation: fadeInUpSimple 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default FloatingCart;
