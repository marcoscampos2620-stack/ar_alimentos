import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  hasAccess: (tab: string) => boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isAdmin, 
  hasAccess,
  isCollapsed,
  setIsCollapsed
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, access: 'dashboard' },
    { id: 'inventory', label: 'Estoque', icon: Package, access: 'inventory' },
    { id: 'pos', label: 'Vendas (PDV)', icon: ShoppingCart, access: 'pos' },
    { id: 'sales', label: 'Histórico de Vendas', icon: Calendar, access: 'sales' },
    { id: 'customers', label: 'Clientes / Fiados', icon: Users, access: 'customers' },
    { id: 'purchases', label: 'Compras / Fornecedores', icon: Truck, access: 'purchases' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <span className="logo-text">A&R Alimentos</span>}
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          hasAccess(item.access) && (
            <button 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={22} />
              {!isCollapsed && <span>{item.label}</span>}
              {activeTab === item.id && !isCollapsed && <div className="active-indicator" />}
            </button>
          )
        ))}

        {isAdmin && (
          <button 
            className={`nav-item admin-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            title={isCollapsed ? 'Gestão de Acessos' : ''}
          >
            <Settings size={22} />
            {!isCollapsed && <span>Acessos</span>}
            {activeTab === 'users' && !isCollapsed && <div className="active-indicator" />}
          </button>
        )}
      </nav>

      <style>{`
        .sidebar {
          width: 260px;
          background: var(--bg-sidebar);
          color: white;
          height: 100vh;
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1001;
          position: sticky;
          top: 0;
          box-shadow: 4px 0 10px rgba(0,0,0,0.1);
        }

        .sidebar.collapsed {
          width: 80px;
        }

        .sidebar-header {
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 80px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .logo-text {
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--primary-light);
          white-space: nowrap;
        }

        .collapse-btn {
          color: rgba(255,255,255,0.6);
          padding: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-item {
          width: 100%;
          padding: 12px;
          justify-content: flex-start;
          color: rgba(255,255,255,0.7);
          border-radius: var(--radius-md);
          position: relative;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
        }

        .active-indicator {
          position: absolute;
          right: 4px;
          width: 4px;
          height: 20px;
          background: white;
          border-radius: 2px;
        }

        .admin-item {
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 24px;
        }

        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 16px;
        }
        
        @media (max-width: 768px) {
          .sidebar { display: none; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
