import React from 'react';
import { LogOut, User, Bell } from 'lucide-react';

interface TopBarProps {
  profile: any;
  signOut: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ profile, signOut }) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title">Sistema de Gestão</h2>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" title="Notificações">
          <Bell size={20} />
          <span className="notification-dot" />
        </button>

        <div className="vertical-divider" />

        <div className="user-profile">
          <div className="user-avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="username">@{profile?.username || 'usuário'}</span>
            <span className="role">{profile?.role}</span>
          </div>
        </div>

        <button onClick={signOut} className="logout-btn" title="Sair do Sistema">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>

      <style>{`
        .topbar {
          height: 80px;
          background: white;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .page-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .icon-btn {
          color: var(--text-muted);
          position: relative;
          padding: 8px;
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--error);
          border-radius: 50%;
          border: 2px solid white;
        }

        .vertical-divider {
          width: 1px;
          height: 24px;
          background: var(--border);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: var(--bg-main);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          border: 1px solid var(--border);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-info .username {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .user-info .role {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .logout-btn {
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .logout-btn:hover {
          color: var(--error);
          background: #fff5f5;
          border-color: #feb2b2;
        }
        
        @media (max-width: 768px) {
          .topbar { 
            padding: 0 16px; 
            height: 60px;
          }
          .page-title { font-size: 1rem; }
          .user-info { display: none; }
          .logout-btn { padding: 6px 10px; }
          .logout-btn span { display: none; }
          .user-avatar { width: 32px; height: 32px; }
        }
      `}</style>
    </header>
  );
};

export default TopBar;
