import React, { useState, useEffect } from 'react';
import SalesView from '../sales/SalesView';
import PurchasesView from '../purchases/PurchasesView';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../config/supabase';

interface DebtKPI {
  totalPending: number;
  countPending: number;
  totalOverdue: number;
  countOverdue: number;
}

const FinancialView: React.FC = () => {
  const [innerTab, setInnerTab] = useState<'sales' | 'purchases'>('sales');
  const [debtKPI, setDebtKPI] = useState<DebtKPI>({ totalPending: 0, countPending: 0, totalOverdue: 0, countOverdue: 0 });

  useEffect(() => {
    fetchDebtKPI();

    const channel = supabase
      .channel('financial-debts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_debts' }, () => {
        fetchDebtKPI();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDebtKPI = async () => {
    const { data } = await supabase
      .from('customer_debts')
      .select('amount, due_date, status')
      .eq('status', 'PENDING');

    if (data) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let totalPending = 0;
      let totalOverdue = 0;
      let countOverdue = 0;

      data.forEach(d => {
        totalPending += Number(d.amount);
        const due = new Date(d.due_date + 'T23:59:59');
        if (due < today) {
          totalOverdue += Number(d.amount);
          countOverdue++;
        }
      });

      setDebtKPI({
        totalPending,
        countPending: data.length,
        totalOverdue,
        countOverdue
      });
    }
  };

  return (
    <div className="financial-container fade-in">
      <div className="view-header-tabs">
        <button
          className={`tab-btn ${innerTab === 'sales' ? 'active' : ''}`}
          onClick={() => setInnerTab('sales')}
        >
          Vendas
        </button>
        <button
          className={`tab-btn ${innerTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setInnerTab('purchases')}
        >
          Fornecedores
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '20px' }}>
        {innerTab === 'sales' ? <SalesView /> : <PurchasesView />}
      </div>

      {/* KPIs de Fiado - Mover para baixo e reduzir tamanho */}
      <div className="debt-kpis-mini-row">
        <div className="kpi-mini-card pending">
          <div className="kpi-mini-info">
            <span className="kpi-mini-label">Fiado Pendente</span>
            <span className="kpi-mini-value">R$ {debtKPI.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <span className="kpi-mini-count">{debtKPI.countPending} abertos</span>
        </div>

        <div className="kpi-mini-card overdue">
          <div className="kpi-mini-info">
            <span className="kpi-mini-label">Fiados Vencidos</span>
            <span className="kpi-mini-value">R$ {debtKPI.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <span className="kpi-mini-count alert">
            <AlertTriangle size={10} />
            {debtKPI.countOverdue} vencidos
          </span>
        </div>
      </div>

      <style>{`
        .financial-container {
          display: flex;
          flex-direction: column;
        }

        /* Mini KPIs Row (Bottom) */
        .debt-kpis-mini-row {
          display: flex;
          gap: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px dashed var(--border);
          justify-content: center;
          flex-wrap: wrap;
        }

        .kpi-mini-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .kpi-mini-card:hover { background: white; transform: translateY(-2px); }

        .kpi-mini-info { display: flex; flex-direction: column; }
        .kpi-mini-label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .kpi-mini-value { font-size: 0.9rem; font-weight: 800; color: var(--text-main); }
        
        .kpi-mini-count { 
          font-size: 0.7rem; 
          font-weight: 700; 
          padding: 4px 8px; 
          border-radius: 20px; 
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .overdue.kpi-mini-card { border-color: #fee2e2; }
        .kpi-mini-count.alert { background: #fee2e2; color: #dc2626; }
        .overdue .kpi-mini-value { color: #dc2626; }

        .view-header-tabs {
          display: flex;
          gap: 12px;
          padding: 6px;
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          width: fit-content;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-radius: 10px;
          font-weight: 700;
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: var(--bg-main);
          color: var(--text-main);
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(30, 136, 229, 0.2);
        }

        @media (max-width: 768px) {
          .debt-kpis-mini-row {
            margin-top: 24px;
            gap: 8px;
          }
          .kpi-mini-card {
            padding: 8px 12px;
            flex: 1;
            min-width: 140px;
            justify-content: center;
          }
          .kpi-mini-value { font-size: 0.8rem; }
          .kpi-mini-label { font-size: 0.6rem; }

          .view-header-tabs {
            width: 100%;
            justify-content: space-between;
          }
          .tab-btn {
            flex: 1;
            justify-content: center;
            padding: 10px 8px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FinancialView;
