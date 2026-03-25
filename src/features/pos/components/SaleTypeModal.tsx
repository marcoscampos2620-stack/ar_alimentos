import React from 'react';
import { Zap, UserPlus, ShoppingBag } from 'lucide-react';

interface SaleTypeModalProps {
  onQuickSale: () => void;
  onCustomerSale: () => void;
  onClose: () => void; // Unused in full-screen but kept for signature compatibility
}

const SaleTypeSelection: React.FC<SaleTypeModalProps> = ({ onQuickSale, onCustomerSale }) => {
  return (
    <div className="native-view fade-in">
      <div className="native-content">
        <div className="welcome-section">
          <div className="icon-circle shadow-lg">
            <ShoppingBag size={32} />
          </div>
          <h2>Nova Venda</h2>
          <p>Como você deseja iniciar o atendimento hoje?</p>
        </div>

        <div className="options-grid">
          <button className="native-option-card shadow-md" onClick={onQuickSale}>
            <div className="icon-box quick">
              <Zap size={32} />
            </div>
            <div className="text-box">
              <h3>Venda Rápida</h3>
              <p>Direto ao cardápio, sem identificação.</p>
            </div>
          </button>

          <button className="native-option-card shadow-md" onClick={onCustomerSale}>
            <div className="icon-box customer">
              <UserPlus size={32} />
            </div>
            <div className="text-box">
              <h3>Cliente Cadastrado</h3>
              <p>Identificar cliente para fiado ou histórico.</p>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        .native-view {
          min-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: var(--bg-main);
        }
        .native-content {
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .welcome-section {
          text-align: center;
        }
        .icon-circle {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: var(--primary);
        }
        .welcome-section h2 {
          font-size: 2rem;
          font-weight: 900;
          color: var(--text-main);
          margin-bottom: 8px;
        }
        .welcome-section p {
          color: var(--text-muted);
          font-weight: 500;
        }
        .options-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .native-option-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: white;
          border-radius: 24px;
          border: 1px solid var(--border);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
        }
        .native-option-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--primary);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.1);
        }
        .icon-box {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-box.quick {
          background: #fffbeb;
          color: #d97706;
        }
        .icon-box.customer {
          background: #eff6ff;
          color: #2563eb;
        }
        .text-box h3 {
          font-weight: 800;
          font-size: 1.2rem;
          color: var(--text-main);
          margin-bottom: 4px;
        }
        .text-box p {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

export default SaleTypeSelection;
