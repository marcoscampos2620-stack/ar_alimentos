import React, { useState } from 'react';
import { Minus, Plus, X, ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  unit_type: string;
  stock_quantity: number;
}

interface QuantityModalProps {
  product: Product;
  onAdd: (qty: number) => void;
  onClose: () => void;
}

const QuantityModal: React.FC<QuantityModalProps> = ({ product, onAdd, onClose }) => {
  const isKg = product.unit_type === 'KG';
  const initialValue = isKg ? 0.500 : 1;
  const [val, setVal] = useState<number>(initialValue);
  const [valStr, setValStr] = useState<string>(initialValue.toString());

  const step = isKg ? 0.100 : 1;
  const hasStock = val <= product.stock_quantity;

  const handleIncrement = () => {
    const newValue = Math.max(0, val + step);
    setVal(newValue);
    setValStr(newValue.toFixed(isKg ? 3 : 0));
  };

  const handleDecrement = () => {
    const newValue = Math.max(0, val - step);
    setVal(newValue);
    setValStr(newValue.toFixed(isKg ? 3 : 0));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    setValStr(s);
    const n = parseFloat(s);
    if (!isNaN(n)) setVal(n);
  };

  const subtotal = val * product.price;

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="quantity-card-inline shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div className="product-info">
            <h3>{product.name}</h3>
            <div className="stock-info">
              <span className={`stock-badge ${product.stock_quantity > 0 ? 'in' : 'out'}`}>
                {product.stock_quantity.toFixed(isKg ? 3 : 0)} {product.unit_type} disponível
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-close"><X size={18} /></button>
        </div>

        <div className="card-body">
          <div className="price-display">
            <span className="label">Preço Unitário</span>
            <span className="value">R$ {product.price.toFixed(2)} / {product.unit_type}</span>
          </div>

          <div className="qty-selector">
            <button className="qty-btn" onClick={handleDecrement} disabled={val <= 0}>
              <Minus size={20} />
            </button>
            <div className="qty-input-wrapper">
              <input 
                type="number" 
                step={step}
                value={valStr}
                onChange={handleInputChange}
                onFocus={(e) => e.target.select()}
                className={!hasStock ? 'input-error' : ''}
              />
              <span className="unit">{product.unit_type}</span>
            </div>
            <button className="qty-btn" onClick={handleIncrement}>
              <Plus size={20} />
            </button>
          </div>

          {!hasStock && (
            <div className="stock-warning">
              Estoque insuficiente para esta quantidade!
            </div>
          )}

          <div className="subtotal-row">
            <span className="label">Subtotal</span>
            <span className="value">R$ {subtotal.toFixed(2)}</span>
          </div>

          <button 
            className="btn-primary btn-add-cart"
            disabled={val <= 0 || !hasStock}
            onClick={() => onAdd(val)}
          >
            <ShoppingCart size={18} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      <style>{`
        .quantity-card-inline {
          width: 95%;
          max-width: 340px;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          padding-bottom: 8px;
        }
        .card-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .product-info h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px; }
        
        .stock-badge {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .stock-badge.in { background: #dcfce7; color: #166534; }
        .stock-badge.out { background: #fee2e2; color: #991b1b; }

        .btn-close { color: var(--text-muted); opacity: 0.6; padding: 4px; }

        .card-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        
        .price-display { display: flex; flex-direction: column; gap: 2px; }
        .price-display .label { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        .price-display .value { font-weight: 700; color: var(--primary); }

        .qty-selector { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          background: #f8fafc; 
          border-radius: 14px; 
          padding: 4px; 
          border: 1px solid var(--border);
        }
        .qty-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 10px;
          box-shadow: var(--shadow-sm);
          color: var(--primary);
          transition: all 0.2s;
        }
        .qty-btn:active:not(:disabled) { transform: scale(0.9); }
        .qty-btn:disabled { opacity: 0.4; color: var(--text-muted); }

        .qty-input-wrapper { display: flex; flex-direction: column; align-items: center; }
        .qty-input-wrapper input {
          width: 100px;
          border: none;
          background: transparent;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--text-main);
          outline: none;
        }
        .qty-input-wrapper input.input-error { color: var(--error); }
        .qty-input-wrapper .unit { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-top: -4px; }

        .stock-warning {
          background: #fee2e2;
          color: #991b1b;
          padding: 10px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .subtotal-row { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 12px 16px; 
          background: #f0f9ff; 
          border-radius: 12px;
          border: 1px dashed #bae6fd;
        }
        .subtotal-row .label { font-size: 0.7rem; font-weight: 800; color: #0369a1; text-transform: uppercase; }
        .subtotal-row .value { font-size: 1.25rem; font-weight: 900; color: #0369a1; }

        .btn-add-cart {
          padding: 14px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 800;
          font-size: 0.95rem;
        }

        /* Hide number input arrows */
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
};

export default QuantityModal;
