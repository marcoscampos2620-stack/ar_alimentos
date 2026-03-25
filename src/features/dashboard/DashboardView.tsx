import React from 'react';
import DashboardCharts from './components/DashboardCharts';

const DashboardView: React.FC = () => {
  return (
    <div className="dashboard-container fade-in">
      <div className="section-header">
        <h1>Dashboard</h1>
        <p>Visão geral do sistema e análise inteligente de dados</p>
      </div>
      
      <DashboardCharts />

      <style>{`
        .dashboard-container { 
          display: flex; 
          flex-direction: column; 
          gap: 32px; 
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .section-header h1 { 
          font-size: 2.25rem; 
          color: var(--text-main); 
          margin-bottom: 8px; 
          font-weight: 900; 
          letter-spacing: -1px;
        }
        .section-header p { 
          color: var(--text-muted); 
          font-size: 1.05rem; 
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .dashboard-container { padding: 16px; gap: 24px; }
          .section-header h1 { font-size: 1.75rem; }
        }
      `}</style>
    </div>
  );
};

export default DashboardView;
