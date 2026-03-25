import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { Search, UserPlus, User, ArrowLeft, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CustomerSelectionModalProps {
  onSelect: (customerId: string, customerName: string) => void;
  onNewCustomer: () => void;
  onBack: () => void;
}

const CustomerSelection: React.FC<CustomerSelectionModalProps> = ({ onSelect, onNewCustomer, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .order('name')
        .limit(20);

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="native-view-full fade-in">
      <div className="native-header">
        <button className="btn-native-back" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <div className="header-text">
          <h3>Selecionar Cliente</h3>
          <p>Busque por nome ou telefone</p>
        </div>
        <button className="btn-native-add" onClick={onNewCustomer}>
          <UserPlus size={22} />
        </button>
      </div>

      <div className="native-search-container shadow-sm">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Quem você está atendendo?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        {loading && <Loader2 size={20} className="animate-spin" />}
      </div>

      <div className="native-list-container">
        {customers.map((c) => (
          <button key={c.id} className="native-list-item" onClick={() => onSelect(c.id, c.name)}>
            <div className="item-avatar">
              <User size={20} />
            </div>
            <div className="item-details">
              <span className="item-name">{c.name}</span>
              <span className="item-phone">{c.phone || 'Sem telefone'}</span>
            </div>
          </button>
        ))}

        {!loading && customers.length === 0 && searchTerm && (
          <div className="empty-state">
            <UserPlus size={48} />
            <p>Cliente não encontrado.</p>
            <button className="btn-link" onClick={onNewCustomer}>
              Cadastrar "{searchTerm}" agora?
            </button>
          </div>
        )}

        {!loading && customers.length === 0 && !searchTerm && (
          <div className="empty-state">
            <UserPlus size={48} />
            <p>Sua lista de clientes está vazia ou carregando.</p>
          </div>
        )}
      </div>

      <style>{`
        .native-view-full {
          min-height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .native-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: white;
          border-bottom: 1px solid var(--border);
        }
        .btn-native-back {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }
        .header-text h3 {
          font-weight: 800;
          font-size: 1.3rem;
          color: var(--text-main);
          margin-bottom: 2px;
        }
        .header-text p {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .btn-native-add {
          margin-left: auto;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: var(--primary);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .native-search-container {
          margin: 20px 24px;
          background: white;
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          border: 1px solid var(--border);
        }
        .native-search-container input {
          flex: 1;
          padding: 16px 12px;
          border: none;
          outline: none;
          font-size: 1rem;
          font-weight: 600;
        }
        .search-icon { color: var(--text-muted); }
        .native-list-container {
          flex: 1;
          overflow-y: auto;
          padding: 0 24px 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .native-list-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 18px;
          border: 1px solid var(--border);
          transition: all 0.2s;
          text-align: left;
          cursor: pointer;
        }
        .native-list-item:hover {
          border-color: var(--primary);
          background: #eff6ff;
          transform: translateY(-2px);
        }
        .item-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .item-name {
          display: block;
          font-weight: 800;
          color: var(--text-main);
          font-size: 1rem;
        }
        .item-phone {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: underline;
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CustomerSelection;
