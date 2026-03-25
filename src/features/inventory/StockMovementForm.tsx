import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { ArrowUpCircle, ArrowDownCircle, Check, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  unit_type: string;
  stock_quantity: number;
}

interface StockMovementFormProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const StockMovementForm: React.FC<StockMovementFormProps> = ({ product, onClose, onSuccess }) => {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Ajuste');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    setLoading(true);

    try {
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: product.id,
          quantity: type === 'in' ? qty : -qty,
          type: type === 'in' ? 'adjustment_in' : 'adjustment_out',
          reason: reason
        }]);

      if (moveError) throw moveError;

      const newStock = type === 'in' 
        ? product.stock_quantity + qty 
        : product.stock_quantity - qty;

      const { error: prodError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id);

      if (prodError) throw prodError;

      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-modal-form">
      <div className="modal-header">
        <div className="product-info-mini">
          <h3>{product.name}</h3>
          <span className="stock-current">Estoque atual: <strong>{product.stock_quantity.toFixed(product.unit_type === 'KG' ? 3 : 0)} {product.unit_type}</strong></span>
        </div>
        <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="type-selector-modern">
        <button 
          type="button" 
          className={`type-btn in ${type === 'in' ? 'active' : ''}`}
          onClick={() => setType('in')}
        >
          <ArrowUpCircle size={24} />
          <span>Entrada</span>
        </button>
        <button 
          type="button" 
          className={`type-btn out ${type === 'out' ? 'active' : ''}`}
          onClick={() => setType('out')}
        >
          <ArrowDownCircle size={24} />
          <span>Saída</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="modal-form-body">
        <div className="input-grid">
          <div className="form-field">
            <label>Quantidade ({product.unit_type})</label>
            <input 
              required
              autoFocus
              type="number" 
              step={product.unit_type === 'KG' ? "0.001" : "1"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="large-input"
            />
          </div>
          
          <div className="form-field">
            <label>Motivo da Movimentação</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="large-select">
              <option value="Ajuste Manual">Ajuste Manual</option>
              <option value="Entrada de Compra">Entrada de Compra</option>
              <option value="Avaria / Perda">Avaria / Perda</option>
              <option value="Consumo Próprio">Consumo Próprio</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className={`btn-submit-modern ${type}`} disabled={loading}>
            {loading ? <span className="spinner-mini"></span> : <Check size={20} />}
            <span>{loading ? 'Salvando...' : 'Confirmar Movimentação'}</span>
          </button>
        </div>
      </form>

      <style>{`
        .stock-modal-form { padding: 24px; }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
        .product-info-mini h3 { font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px; }
        .stock-current { font-size: 0.85rem; color: var(--text-muted); }
        .stock-current strong { color: var(--primary); }
        
        .btn-close-modal { background: #f1f5f9; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
        .btn-close-modal:hover { background: #fee2e2; color: #ef4444; }

        .type-selector-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border-radius: 16px;
          border: 2px solid var(--border);
          background: white;
          color: var(--text-muted);
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .type-btn.in.active { border-color: #10b981; color: #10b981; background: #f0fdf4; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1); }
        .type-btn.out.active { border-color: #ef4444; color: #ef4444; background: #fef2f2; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1); }

        .modal-form-body { display: flex; flex-direction: column; gap: 20px; }
        .input-grid { display: grid; gap: 16px; }
        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .form-field label { font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
        
        .large-input, .large-select {
          height: 52px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1.5px solid var(--border);
          font-size: 1rem;
          font-weight: 600;
          outline: none;
          transition: 0.2s;
        }
        .large-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

        .modal-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 12px; }
        .btn-cancel { height: 52px; border-radius: 12px; border: 1.5px solid var(--border); background: white; color: var(--text-muted); font-weight: 700; cursor: pointer; }
        .btn-submit-modern {
          height: 52px;
          border-radius: 12px;
          border: none;
          color: white;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-submit-modern.in { background: #10b981; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3); }
        .btn-submit-modern.out { background: #ef4444; box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3); }
        .btn-submit-modern:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-submit-modern:disabled { opacity: 0.5; transform: none; }

        .spinner-mini {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StockMovementForm;
