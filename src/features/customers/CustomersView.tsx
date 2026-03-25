import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Plus, Search, Phone, ArrowLeft } from 'lucide-react';
import CustomerForm from './CustomerForm';

interface Customer {
  id: string;
  name: string;
  phone: string;
  total_debt: number;
}

const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
    setLoading(false);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => setShowForm(false)}>
            <ArrowLeft size={20} />
          </button>
          <h2>Novo Cliente</h2>
        </div>
        <div className="form-view-content">
          <CustomerForm 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              fetchCustomers();
              setShowForm(false);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view fade-in">
      <div className="view-header">
        <h2>Clientes / Fiados</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input 
          type="text" 
          placeholder="Buscar cliente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="customer-list">
          {filtered.map(customer => (
            <div key={customer.id} className="card customer-card">
              <div className="customer-info">
                <span className="customer-name">{customer.name}</span>
                <span className="customer-phone">
                  <Phone size={12} /> {customer.phone || 'Sem telefone'}
                </span>
              </div>
              <div className="customer-debt">
                <span className="label">Dívida Atual</span>
                <span className={`value ${customer.total_debt > 0 ? 'debt' : ''}`}>
                  R$ {customer.total_debt.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .customer-list { display: flex; flex-direction: column; gap: 12px; }
        .customer-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
        .customer-info { display: flex; flex-direction: column; gap: 4px; }
        .customer-name { font-weight: 700; font-size: 1rem; }
        .customer-phone { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        .customer-debt { text-align: right; }
        .customer-debt .label { font-size: 0.7rem; color: var(--text-muted); display: block; }
        .customer-debt .value { font-weight: 800; font-size: 1.1rem; }
        .customer-debt .value.debt { color: var(--error); }
      `}</style>
    </div>
  );
};

export default CustomersView;
