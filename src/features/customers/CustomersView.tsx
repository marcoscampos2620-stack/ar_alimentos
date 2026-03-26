import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from '../../config/supabase';
import { Plus, Search, Phone, ArrowLeft, ChevronRight, CheckCircle, AlertTriangle, Calendar, DollarSign, Pencil, Trash2 } from 'lucide-react';
import CustomerForm from './CustomerForm';
import DebtDetailView from './DebtDetailView';

interface CustomerDebt {
  id: string;
  sale_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  total_debt: number;
  customer_debts?: CustomerDebt[];
}

interface SaleSummary {
  total_normal: number;
  total_fiado: number;
}

const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saleSummaries, setSaleSummaries] = useState<Record<string, SaleSummary>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<{ debt: CustomerDebt; customerId: string; customerName: string } | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, customer_debts(*)')
      .order('name');

    if (data) setCustomers(data);

    // Buscar resumo de vendas por cliente (normal vs fiado)
    const { data: sales } = await supabase
      .from('sales')
      .select('customer_id, total_amount, payment_method')
      .not('customer_id', 'is', null);

    if (sales) {
      const summaries: Record<string, SaleSummary> = {};
      sales.forEach(s => {
        if (!s.customer_id) return;
        if (!summaries[s.customer_id]) {
          summaries[s.customer_id] = { total_normal: 0, total_fiado: 0 };
        }
        if (s.payment_method === 'DEBT') {
          summaries[s.customer_id].total_fiado += Number(s.total_amount);
        } else {
          summaries[s.customer_id].total_normal += Number(s.total_amount);
        }
      });
      setSaleSummaries(summaries);
    }

    setLoading(false);
  };



  const isOverdue = (dueDate: string) => {
    return new Date(dueDate + 'T23:59:59') < new Date();
  };

  const hasOverdueDebts = (customer: Customer) => {
    return (customer.customer_debts || []).some(
      d => d.status === 'PENDING' && isOverdue(d.due_date)
    );
  };

  const pendingDebts = (customer: Customer) => {
    return (customer.customer_debts || []).filter(d => d.status === 'PENDING');
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      // 1. Desvincular das vendas (set null)
      await supabase.from('sales').update({ customer_id: null }).eq('customer_id', customer.id);
      
      // 2. Deletar pagamentos de dívida
      await supabase.from('debt_payments').delete().eq('customer_id', customer.id);
      
      // 3. Deletar dívidas
      await supabase.from('customer_debts').delete().eq('customer_id', customer.id);

      // 4. Deletar cliente
      const { error } = await supabase.from('customers').delete().eq('id', customer.id);
      if (error) throw error;
      
      setDeletingCustomerId(null);
      fetchCustomers();
    } catch (error: any) {
      alert('Erro ao excluir cliente: ' + error.message);
    }
  };

  if (selectedDebt) {
    return (
      <DebtDetailView
        debt={selectedDebt.debt}
        customerId={selectedDebt.customerId}
        customerName={selectedDebt.customerName}
        onBack={() => setSelectedDebt(null)}
        onUpdated={fetchCustomers}
      />
    );
  }

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => { setShowForm(false); setEditingCustomer(null); }}>
            <ArrowLeft size={20} />
          </button>
          <h2>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
        </div>
        <div className="form-view-content">
          <CustomerForm
            customer={editingCustomer || undefined}
            onClose={() => { setShowForm(false); setEditingCustomer(null); }}
            onSuccess={() => {
              fetchCustomers();
              setShowForm(false);
              setEditingCustomer(null);
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
        <button className="btn-primary" onClick={() => { setEditingCustomer(null); setShowForm(true); }}>
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
          {filtered.map(customer => {
            const overdue = hasOverdueDebts(customer);
            const pending = pendingDebts(customer);
            const summary = saleSummaries[customer.id] || { total_normal: 0, total_fiado: 0 };
            const isExpanded = expandedCustomerId === customer.id;

            return (
              <div key={customer.id} className={`customer-card-wrapper ${overdue ? 'overdue' : ''}`}>
                <div
                  className={`card customer-card ${overdue ? 'card-overdue' : ''}`}
                  onClick={() => toggleExpand(customer.id)}
                >
                  <div className="customer-info">
                    <div className="customer-name-row">
                      <span className="customer-name">{customer.name}</span>
                      {overdue && (
                        <span className="overdue-badge">
                          <AlertTriangle size={12} />
                          Inadimplente
                        </span>
                      )}
                    </div>
                    <span className="customer-phone">
                      <Phone size={12} /> {customer.phone || 'Sem telefone'}
                    </span>
                    <div className="customer-actions-inline">
                      <button className="btn-action-sm edit" onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }} title="Editar">
                        <Pencil size={14} />
                      </button>
                      {deletingCustomerId === customer.id ? (
                        <div className="delete-inline-confirm" onClick={(e) => e.stopPropagation()}>
                          <span>Excluir?</span>
                          <button className="btn-yes-sm" onClick={() => handleDeleteCustomer(customer)}>Sim</button>
                          <button className="btn-no-sm" onClick={() => setDeletingCustomerId(null)}>Não</button>
                        </div>
                      ) : (
                        <button className="btn-action-sm delete" onClick={(e) => { e.stopPropagation(); setDeletingCustomerId(customer.id); }} title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="customer-stats">
                      <span className="stat-pill normal">
                        <DollarSign size={12} />
                        Normal: {formatCurrency(summary.total_normal)}
                      </span>
                      <span className="stat-pill fiado">
                        <Calendar size={12} />
                        Fiado: {formatCurrency(summary.total_fiado)}
                      </span>
                    </div>
                  </div>
                  <div className="customer-debt-section">
                    <span className="label">Dívida Pendente</span>
                    <span className={`value ${customer.total_debt > 0 ? 'debt' : 'clean'}`}>
                      {formatCurrency(customer.total_debt)}
                    </span>
                    {pending.length > 0 && (
                      <span className="debt-count">{pending.length} fiado{pending.length > 1 ? 's' : ''}</span>
                    )}
                    <ChevronRight size={18} className={`expand-icon ${isExpanded ? 'rotated' : ''}`} />
                  </div>
                </div>

                {/* Painel expandido de detalhes de fiados */}
                {isExpanded && (
                  <div className="debts-panel fade-in">
                    <h4 className="panel-title">
                      <Calendar size={16} />
                      Fiados de {customer.name}
                    </h4>

                    {pending.length === 0 && (
                      <div className="no-debts">
                        <CheckCircle size={20} />
                        <span>Nenhum fiado pendente!</span>
                      </div>
                    )}

                    {(customer.customer_debts || [])
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .map(debt => {
                        const overdueDebt = debt.status === 'PENDING' && isOverdue(debt.due_date);
                        return (
                          <div key={debt.id} className={`debt-row ${debt.status === 'PAID' ? 'paid' : ''} ${overdueDebt ? 'overdue-row' : ''}`}>
                            <div className="debt-info">
                              <div className="debt-amount">{formatCurrency(debt.amount)}</div>
                              <div className="debt-meta">
                                <span className={`due-date ${overdueDebt ? 'overdue-text' : ''}`}>
                                  {overdueDebt && <AlertTriangle size={12} />}
                                  Venc: {new Date(debt.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                {debt.paid_at && (
                                  <span className="paid-date">
                                    Pago: {new Date(debt.paid_at).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="debt-actions">
                              {debt.status === 'PAID' && (
                                <span className="paid-badge">
                                  <CheckCircle size={14} />
                                  Quitado
                                </span>
                              )}
                              <button
                                className="btn-ver-nota"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDebt({ debt, customerId: customer.id, customerName: customer.name });
                                }}
                              >
                                Ver Nota
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .customer-list { display: flex; flex-direction: column; gap: 12px; }
        .customer-card-wrapper { display: flex; flex-direction: column; }
        
        .customer-card { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 16px; 
          cursor: pointer;
          transition: all 0.2s;
        }
        .customer-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        
        .card-overdue { 
          border-left: 4px solid #ef4444 !important;
          background: linear-gradient(135deg, #fff5f5 0%, white 100%);
        }

        .customer-info { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .customer-name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .customer-name { font-weight: 700; font-size: 1rem; }
        .overdue-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 800;
          color: #dc2626;
          background: #fee2e2;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .customer-phone { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        
        .customer-actions-inline {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .btn-action-sm {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: white;
          color: var(--text-muted);
          transition: all 0.2s;
          cursor: pointer;
        }
        .btn-action-sm:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
        .btn-action-sm.edit:hover {
          color: var(--primary);
          border-color: var(--primary-light);
          background: #eff6ff;
        }
        .btn-action-sm.delete:hover {
          color: #ef4444;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .delete-inline-confirm {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          padding: 4px 8px;
          border-radius: 10px;
          border: 1px solid #fecaca;
          font-size: 0.75rem;
          font-weight: 700;
          color: #991b1b;
          animation: slideInRight 0.2s ease-out;
        }
        .btn-yes-sm, .btn-no-sm {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
        }
        .btn-yes-sm { background: #ef4444; color: white; }
        .btn-no-sm { background: #f1f5f9; color: var(--text-muted); }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .customer-stats { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 8px;
        }
        .stat-pill.normal { background: #f0fdf4; color: #166534; }
        .stat-pill.fiado { background: #eff6ff; color: #1e40af; }

        .customer-debt-section { 
          text-align: right; 
          display: flex; 
          flex-direction: column; 
          align-items: flex-end; 
          gap: 4px;
          min-width: 120px;
        }
        .customer-debt-section .label { font-size: 0.7rem; color: var(--text-muted); display: block; }
        .customer-debt-section .value { font-weight: 800; font-size: 1.1rem; }
        .customer-debt-section .value.debt { color: #ef4444; }
        .customer-debt-section .value.clean { color: #22c55e; }
        .debt-count { font-size: 0.7rem; color: #f59e0b; font-weight: 700; }
        
        .expand-icon { 
          color: var(--text-muted); 
          transition: transform 0.3s;
          margin-top: 4px;
        }
        .expand-icon.rotated { transform: rotate(90deg); }

        /* Debts Panel */
        .debts-panel {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 16px 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 4px;
        }

        .no-debts {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #22c55e;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 12px;
        }

        .debt-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        .debt-row.paid { 
          opacity: 0.6;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .debt-row.overdue-row {
          background: #fff5f5;
          border-color: #fecaca;
        }

        .debt-info { display: flex; flex-direction: column; gap: 4px; }
        .debt-amount { font-weight: 800; font-size: 1.05rem; color: var(--text-main); }
        .debt-meta { display: flex; gap: 12px; flex-wrap: wrap; }
        .due-date { 
          font-size: 0.75rem; 
          font-weight: 700; 
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .due-date.overdue-text { color: #ef4444; }
        .paid-date { font-size: 0.75rem; font-weight: 600; color: #22c55e; }

        .debt-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .paid-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #22c55e;
          background: #dcfce7;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .btn-ver-nota {
          background: var(--primary);
          color: white;
          padding: 6px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.2s;
          white-space: nowrap;
          border: none;
          cursor: pointer;
        }
        .btn-ver-nota:hover {
          background: #1565c0;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
        }

        .btn-confirm-pay {
          background: var(--primary);
          color: white;
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-confirm-pay:hover:not(:disabled) {
          background: #1565c0;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
        }
        .btn-confirm-pay:disabled { opacity: 0.6; }

        @media (max-width: 768px) {
          .customer-card { flex-direction: column; align-items: flex-start; gap: 12px; }
          .customer-debt-section { 
            flex-direction: row; 
            align-items: center;
            gap: 12px;
            width: 100%;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px solid var(--border);
          }
          .debt-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .debt-actions { width: 100%; }
          .btn-confirm-pay { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
};

export default CustomersView;
