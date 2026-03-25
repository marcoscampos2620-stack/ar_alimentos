import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  Calendar
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import InventoryView from './features/inventory/InventoryView';
import POSView from './features/pos/POSView';
import CustomersView from './features/customers/CustomersView';
import DashboardView from './features/dashboard/DashboardView';
import PurchasesView from './features/purchases/PurchasesView';
import SalesView from './features/sales/SalesView';
import UsersManagementView from './features/admin/UsersManagementView';
import LoginView from './features/auth/LoginView';
import MainLayout from './features/layout/MainLayout';
import './App.css';

// Add light-theme to body on initialization
document.body.classList.add('light-theme');

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>A&R Alimentos</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Lógica de permissões dinâmica baseada no Perfil
  const perms = profile?.permissions || [];
  const isAdmin = profile?.role === 'ADMIN';

  const hasAccess = (tab: string) => perms.includes(tab) || isAdmin;

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      profile={profile}
      signOut={signOut}
      isAdmin={isAdmin}
      hasAccess={hasAccess}
    >
      <div className="view-container fade-in">
        {activeTab === 'dashboard' && hasAccess('dashboard') && <DashboardView />}
        {activeTab === 'inventory' && hasAccess('inventory') && <InventoryView />}
        {activeTab === 'pos' && hasAccess('pos') && <POSView />}
        {activeTab === 'sales' && hasAccess('sales') && <SalesView />}
        {activeTab === 'customers' && hasAccess('customers') && <CustomersView />}
        {activeTab === 'purchases' && hasAccess('purchases') && <PurchasesView />}
        {activeTab === 'users' && isAdmin && <UsersManagementView />}
        
        {!hasAccess(activeTab) && (
          <div className="forbidden">
            <h3>Acesso Restrito</h3>
            <p>Seu usuário não tem permissão para esta funcionalidade.</p>
          </div>
        )}
      </div>

      {/* Navegação inferior apenas para Mobile */}
      <nav className="bottom-nav mobile-only">
        {hasAccess('dashboard') && (
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            <span>Início</span>
          </button>
        )}
        {hasAccess('inventory') && (
          <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
            <Package size={20} />
            <span>Estoque</span>
          </button>
        )}
        {hasAccess('pos') && (
          <button className={activeTab === 'pos' ? 'active' : ''} onClick={() => setActiveTab('pos')} id="btn-pos">
            <div className="pos-fab">
              <ShoppingCart size={22} />
            </div>
          </button>
        )}
        {hasAccess('sales') && (
          <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>
            <Calendar size={20} />
            <span>Vendas</span>
          </button>
        )}
        {hasAccess('customers') && (
          <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>
            <Users size={20} />
            <span>Fiados</span>
          </button>
        )}
        {isAdmin && (
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <Settings size={20} />
            <span>Acessos</span>
          </button>
        )}
      </nav>
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
