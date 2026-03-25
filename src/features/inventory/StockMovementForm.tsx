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
    <div className="stock-inline-form animate-slide-down">
      <div className="inline-form-header">
        <span className="title">Movimentar Estoque</span>
        <button className="btn-close-mini" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="type-toggle-mini">
        <button 
          type="button" 
          className={`toggle-btn in ${type === 'in' ? 'active' : ''}`}
          onClick={() => setType('in')}
        >
          <ArrowUpCircle size={14} /> Entrada
        </button>
        <button 
          type="button" 
          className={`toggle-btn out ${type === 'out' ? 'active' : ''}`}
          onClick={() => setType('out')}
        >
          <ArrowDownCircle size={14} /> Saída
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mini-form-body">
        <div className="input-row">
          <div className="mini-group">
            <label>Qtd ({product.unit_type})</label>
            <input 
              required
              autoFocus
              type="number" 
              step={product.unit_type === 'KG' ? "0.001" : "1"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="mini-group">
            <label>Motivo</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Ajuste">Ajuste</option>
              <option value="Compra">Compra</option>
              <option value="Avaria">Avaria</option>
              <option value="Consumo">Consumo</option>
            </select>
          </div>
        </div>

        <button type="submit" className={`btn-submit-mini ${type}`} disabled={loading}>
          {loading ? '...' : <Check size={18} />}
          <span>{loading ? 'Salvando' : 'Confirmar'}</span>
        </button>
      </form>

      <style>{`
        .stock-inline-form {
          background: #f8fafc;
          border-radius: var(--radius-sm);
          padding: 12px;
          margin-top: 12px;
          border: 1px dashed var(--border);
        }
        .inline-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .inline-form-header .title {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .btn-close-mini {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
        }

        .type-toggle-mini {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 12px;
        }
        .toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .toggle-btn.in.active { border-color: var(--success); color: var(--success); background: #f0fdf4; }
        .toggle-btn.out.active { border-color: var(--error); color: var(--error); background: #fef2f2; }

        .mini-form-body { display: flex; flex-direction: column; gap: 10px; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        
        .mini-group { display: flex; flex-direction: column; gap: 4px; }
        .mini-group label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); }
        .mini-group input, .mini-group select {
          padding: 6px 8px;
          font-size: 0.85rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: white;
        }

        .btn-submit-mini {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 6px;
          border: none;
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .btn-submit-mini.in { background: var(--success); shadow: 0 2px 4px rgba(34, 197, 94, 0.2); }
        .btn-submit-mini.out { background: var(--error); shadow: 0 2px 4px rgba(239, 68, 68, 0.2); }
        .btn-submit-mini:hover { filter: brightness(1.1); }
        .btn-submit-mini:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default StockMovementForm;
