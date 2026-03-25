import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  profile: any;
  signOut: () => void;
  isAdmin: boolean;
  hasAccess: (tab: string) => boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  profile, 
  signOut,
  isAdmin,
  hasAccess
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="layout-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
        hasAccess={hasAccess}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <div className="content-wrapper">
        <TopBar user={user} profile={profile} signOut={signOut} />
        <main className="main-viewport">
          {children}
        </main>
      </div>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background: var(--bg-main);
        }

        .content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Prevents flex children from overflowing */
        }

        .main-viewport {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .main-viewport { padding: 16px; padding-bottom: 100px; }
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
