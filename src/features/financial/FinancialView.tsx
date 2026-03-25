import React, { useState } from 'react';
import SalesView from '../sales/SalesView';
import PurchasesView from '../purchases/PurchasesView';
import { Calendar, Truck } from 'lucide-react';

const FinancialView: React.FC = () => {
  const [innerTab, setInnerTab] = useState<'sales' | 'purchases'>('sales');

  return (
    <div className="financial-container fade-in">
      <div className="view-header-tabs">
        <button 
          className={`tab-btn ${innerTab === 'sales' ? 'active' : ''}`}
          onClick={() => setInnerTab('sales')}
        >
          <Calendar size={18} />
          Vendas
        </button>
        <button 
          className={`tab-btn ${innerTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setInnerTab('purchases')}
        >
          <Truck size={18} />
          Fornecedores
        </button>
      </div>

      <div className="tab-content" style={{ marginTop: '20px' }}>
        {innerTab === 'sales' ? <SalesView /> : <PurchasesView />}
      </div>

      <style>{`
        .financial-container {
          display: flex;
          flex-direction: column;
        }

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
