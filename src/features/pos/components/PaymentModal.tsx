import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, QrCode, User, Check } from 'lucide-react';
import { supabase } from '../../../config/supabase';

interface PaymentModalProps {
  total: number;
  selectedCustomerId: string;
  customers: any[];
  onSelectCustomer: (id: string) => void;
  onFinalize: (method: string, invoiceNumber: number, dueDate?: string) => void;
  onClose: () => void;
  loading: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  total, 
  selectedCustomerId, 
  customers, 
  onSelectCustomer, 
  onFinalize, 
  onClose,
  loading
}) => {
  const [method, setMethod] = useState<string | null>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [change, setChange] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [fetchingInvoice, setFetchingInvoice] = useState(false);

  useEffect(() => {
    fetchNextInvoice();
  }, []);

  const fetchNextInvoice = async () => {
    setFetchingInvoice(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('invoice_number')
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const lastNumber = data && data.length > 0 && data[0].invoice_number ? Number(data[0].invoice_number) : 0;
      setInvoiceNumber((lastNumber + 1).toString());
    } catch (err) {
      console.error('Erro ao buscar última nota:', err);
    } finally {
      setFetchingInvoice(false);
    }
  };

  useEffect(() => {
    if (method === 'CASH' && cashAmount) {
      const received = parseFloat(cashAmount);
      if (!isNaN(received)) {
        setChange(Math.max(0, received - total));
      } else {
        setChange(0);
      }
    } else {
      setChange(0);
    }
  }, [method, cashAmount, total]);

  const canFinalize = method && (method !== 'CASH' || (parseFloat(cashAmount) >= total)) && (method !== 'DEBT' || dueDate);

  const handleFinalize = () => {
    if (method && invoiceNumber) {
      onFinalize(method, parseInt(invoiceNumber), method === 'DEBT' ? dueDate : undefined);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="payment-card slide-up shadow-xl">
        <div className="modal-header">
          <h3>Finalizar Venda</h3>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div className="payment-content">
          <div className="total-display glass">
            <span className="label">Total a Pagar</span>
            <span className="value">R$ {total.toFixed(2)}</span>
          </div>

          <div className="invoice-selection fade-in">
            <label className="section-label">Número da Nota</label>
            <div className={`customer-box ${invoiceNumber ? 'active' : ''}`}>
              <Banknote size={18} />
              <input 
                type="number" 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={fetchingInvoice ? "Carregando..." : "Nº da Nota"}
                required
              />
            </div>
          </div>

          <div className="customer-selection">
            <label className="section-label">Cliente (Opcional p/ Fiado)</label>
            <div className={`customer-box ${selectedCustomerId ? 'active' : ''}`}>
              <User size={18} />
              <select value={selectedCustomerId} onChange={(e) => onSelectCustomer(e.target.value)}>
                <option value="">Consumidor Final</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="payment-methods">
            <label className="section-label">Forma de Pagamento</label>
            <div className="method-grid">
              <button 
                className={`method-btn card shadow-sm ${method === 'CASH' ? 'selected' : ''}`}
                onClick={() => setMethod('CASH')}
                disabled={loading}
              >
                <Banknote size={24} />
                <span>Dinheiro</span>
                {method === 'CASH' && <Check size={16} className="check-icon" />}
              </button>
              <button 
                className={`method-btn card shadow-sm ${method === 'CARD' ? 'selected' : ''}`}
                onClick={() => setMethod('CARD')}
                disabled={loading}
              >
                <CreditCard size={24} />
                <span>Cartão</span>
                {method === 'CARD' && <Check size={16} className="check-icon" />}
              </button>
              <button 
                className={`method-btn card shadow-sm ${method === 'PIX' ? 'selected' : ''}`}
                onClick={() => setMethod('PIX')}
                disabled={loading}
              >
                <QrCode size={24} />
                <span>PIX</span>
                {method === 'PIX' && <Check size={16} className="check-icon" />}
              </button>
              <button 
                className={`method-btn card shadow-sm ${method === 'DEBT' ? 'selected' : ''} ${!selectedCustomerId ? 'disabled' : ''}`}
                onClick={() => selectedCustomerId && setMethod('DEBT')}
                disabled={!selectedCustomerId || loading}
              >
                <User size={24} />
                <span>Fiado</span>
                {method === 'DEBT' && <Check size={16} className="check-icon" />}
              </button>
            </div>
          </div>

          {method === 'CASH' && (
            <div className="cash-details fade-in">
              <div className="input-group">
                <label>Valor Recebido</label>
                <div className="amount-input">
                  <span className="prefix">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="change-display">
                <span className="label">Troco</span>
                <span className="value">R$ {change.toFixed(2)}</span>
              </div>
            </div>
          )}

          {method === 'DEBT' && (
            <div className="debt-details fade-in">
              <div className="input-group">
                <label>Data de Vencimento do Fiado</label>
                <div className="amount-input">
                  <span className="prefix">📅</span>
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <p className="debt-info-text">O cliente deverá quitar até a data escolhida.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-primary btn-block btn-xl finalize-btn"
            disabled={!canFinalize || loading}
            onClick={handleFinalize}
          >
            {loading ? 'Finalizando...' : 'Confirmar e Finalizar'}
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Gravando venda...</span>
          </div>
        )}
      </div>

      <style>{`
        .payment-card {
          width: 95%;
          max-width: 450px;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .modal-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
        .modal-header h3 { font-weight: 800; color: var(--text-main); }
        
        .payment-content { padding: 20px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
        
        .total-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid var(--border);
        }
        .total-display .label { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .total-display .value { font-size: 2rem; font-weight: 900; color: var(--primary); }

        .section-label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; display: block; }
        
        .customer-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-main);
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .customer-box.active { border-color: var(--primary); background: #eef2ff; }
        .customer-box select { flex: 1; border: none; background: transparent; outline: none; font-weight: 600; color: var(--text-main); }

        .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .method-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: white;
          border-radius: 16px;
          transition: all 0.2s;
          position: relative;
          border: 1px solid var(--border);
        }
        .method-btn:not(.disabled):hover { border-color: var(--primary); color: var(--primary); }
        .method-btn.selected { border-color: var(--primary); background: #eef2ff; color: var(--primary); }
        .method-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }
        .method-btn span { font-weight: 700; font-size: 0.9rem; }
        
        .check-icon { position: absolute; top: 8px; right: 8px; }

        .cash-details {
          background: #fffbeb;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #fef3c7;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .input-group label { font-size: 0.75rem; font-weight: 800; color: #92400e; text-transform: uppercase; display: block; margin-bottom: 6px; }
        .amount-input {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #fbbf24;
          border-radius: 10px;
          padding: 8px 12px;
        }
        .amount-input .prefix { font-weight: 800; color: #b45309; }
        .amount-input input {
          flex: 1;
          border: none;
          outline: none;
          padding: 4px 8px;
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .change-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px dashed #fcd34d;
        }
        .change-display .label { font-weight: 700; color: #92400e; }
        .change-display .value { font-size: 1.5rem; font-weight: 900; color: #b45309; }

        .debt-details {
          background: #eff6ff;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #bfdbfe;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .debt-details .input-group label { font-size: 0.75rem; font-weight: 800; color: #1e40af; text-transform: uppercase; display: block; margin-bottom: 6px; }
        .debt-details .amount-input {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #60a5fa;
          border-radius: 10px;
          padding: 8px 12px;
        }
        .debt-details .amount-input .prefix { font-size: 1.1rem; }
        .debt-details .amount-input input {
          flex: 1;
          border: none;
          outline: none;
          padding: 4px 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
        }
        .debt-info-text { font-size: 0.8rem; font-weight: 600; color: #3b82f6; margin: 0; }

        .modal-footer { padding: 20px; border-top: 1px solid var(--border); }
        .finalize-btn { text-transform: uppercase; }

        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 700;
          backdrop-filter: blur(2px);
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

export default PaymentModal;
