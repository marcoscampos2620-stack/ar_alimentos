import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Plus, Calendar, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import PurchaseEntry from './PurchaseEntry';

interface Purchase {
  id: string;
  supplier: { name: string };
  total_amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'PENDING' | 'PAID';
}

const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('purchases')
      .select('*, supplier:suppliers(name)')
      .order('due_date', { ascending: true });
    
    if (data) setPurchases(data as any);
  };

  const handleTogglePayment = async (purchase: Purchase) => {
    const newStatus = purchase.status === 'PENDING' ? 'PAID' : 'PENDING';
    const payDate = newStatus === 'PAID' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('purchases')
      .update({ status: newStatus, payment_date: payDate })
      .eq('id', purchase.id);

    if (!error) fetchPurchases();
  };

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => setShowForm(false)}>
            <ArrowLeft size={20} />
          </button>
          <h2>Registrar Compra</h2>
        </div>
        <div className="form-view-content">
          <PurchaseEntry 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              fetchPurchases();
              setShowForm(false);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view fade-in">
      <div className="view-header">
        <h2>Contas a Pagar</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Nova Compra
        </button>
      </div>

      <div className="purchase-list">
        {purchases.map(p => (
          <div key={p.id} className={`card purchase-card ${p.status.toLowerCase()}`}>
            <div className="purchase-info">
              <span className="supplier-name">{p.supplier?.name}</span>
              <span className="due-date">
                <Calendar size={14} /> Venc: {new Date(p.due_date).toLocaleDateString()}
              </span>
            </div>
            <div className="purchase-status-amount">
              <span className="amount">R$ {p.total_amount.toFixed(2)}</span>
              <button 
                className={`status-chip ${p.status.toLowerCase()}`}
                onClick={() => handleTogglePayment(p)}
              >
                {p.status === 'PAID' ? <CheckCircle size={14} /> : <Clock size={14} />}
                {p.status === 'PAID' ? 'Pago' : 'Pendente'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .purchase-list { display: flex; flex-direction: column; gap: 12px; }
        .purchase-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-left: 4px solid var(--border); }
        .purchase-card.paid { border-left-color: var(--success); }
        .purchase-card.pending { border-left-color: var(--error); }
        
        .purchase-info { display: flex; flex-direction: column; gap: 4px; }
        .supplier-name { font-weight: 700; font-size: 1rem; }
        .due-date { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        
        .purchase-status-amount { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .purchase-status-amount .amount { font-weight: 800; font-size: 1.1rem; }
        
        .status-chip { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .status-chip.paid { background: #e8f5e9; color: var(--success); }
        .status-chip.pending { background: #ffebee; color: var(--error); }
      `}</style>
    </div>
  );
};

export default PurchasesView;
