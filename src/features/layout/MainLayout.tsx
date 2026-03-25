import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  profile: any;
  signOut: () => void;
  isAdmin: boolean;
  hasAccess: (tab: string) => boolean;
}

export default function MainLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  user, 
  profile, 
  signOut,
  isAdmin,
  hasAccess
}: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`layout-container ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
      style={{ 
        '--sidebar-width': isCollapsed ? '80px' : '260px' 
      } as React.CSSProperties}
    >
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
        hasAccess={hasAccess}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <div className="content-wrapper">
        <TopBar 
          user={user} 
          profile={profile} 
          signOut={signOut} 
          isAdmin={isAdmin}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
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
          .layout-container { --sidebar-width: 0px !important; }
          .main-viewport { padding: 16px; padding-bottom: 100px; }
        }
      `}</style>
    </div>
  );
}
