import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Search, 
  Trash2, 
  Calendar, 
  User, 
  CreditCard, 
  ChevronRight,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  customer_id?: string;
  created_at: string;
  customers?: { name: string };
  items?: any[];
}

const SalesView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      alert('Erro ao carregar vendas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleItems = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, products(name, unit_type)')
        .eq('sale_id', saleId);

      if (error) throw error;
      
      setSales(prev => prev.map(s => 
        s.id === saleId ? { ...s, items: data } : s
      ));
    } catch (error: any) {
      console.error('Erro ao carregar itens da venda:', error);
    }
  };

  const toggleExpand = (saleId: string) => {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
    } else {
      setExpandedSaleId(saleId);
      const sale = sales.find(s => s.id === saleId);
      if (sale && !sale.items) {
        fetchSaleItems(saleId);
      }
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    try {
      // 1. Delete sale items
      await supabase.from('sale_items').delete().eq('sale_id', sale.id);
      
      // 2. Delete stock movement associated (if matches "Venda #ID")
      const saleRef = `Venda #${sale.id.slice(0, 8)}`;
      await supabase.from('stock_movements').delete().eq('reason', saleRef);
      
      // 3. Delete sale
      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      
      if (error) throw error;
      
      setDeletingSaleId(null);
      fetchSales();
    } catch (error: any) {
      alert('Erro ao excluir venda: ' + error.message);
    }
  };

  const filteredSales = sales.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesId = s.id.toLowerCase().includes(term);
    const matchesCustomer = s.customers?.name.toLowerCase().includes(term);
    return matchesId || matchesCustomer;
  });

  return (
    <div className="sales-view fade-in">
      <div className="section-header">
        <h1>Histórico de Vendas</h1>
        <p>Acompanhe e gerencie todas as transações realizadas no PDV</p>
      </div>

      <div className="filters-bar shadow-sm">
        <div className="search-pill">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar por ID ou Cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="sales-list">
        {loading ? (
          <div className="loading-placeholder">Carregando transações...</div>
        ) : filteredSales.length === 0 ? (
          <div className="empty-state">Nenhuma venda encontrada.</div>
        ) : (
          filteredSales.map(sale => (
            <div key={sale.id} className={`sale-card shadow-sm ${expandedSaleId === sale.id ? 'expanded' : ''}`}>
              <div className="sale-summary" onClick={() => toggleExpand(sale.id)}>
                <div className="sale-main-info">
                  <div className="date-badge">
                    <Calendar size={14} />
                    {format(parseISO(sale.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </div>
                  <span className="sale-id">ID: {sale.id.slice(0, 8)}</span>
                </div>
                
                <div className="sale-customer">
                  <User size={16} />
                  <span>{sale.customers?.name || 'Cliente Casual'}</span>
                </div>

                <div className="sale-payment">
                  <CreditCard size={16} />
                  <span>{sale.payment_method}</span>
                </div>

                <div className="sale-total">
                  R$ {Number(sale.total_amount).toFixed(2)}
                </div>

                <div className="sale-expand-icon">
                  {expandedSaleId === sale.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>

              {expandedSaleId === sale.id && (
                <div className="sale-details animate-fade-in">
                  <div className="items-list">
                    <h4>Itens da Venda</h4>
                    {!sale.items ? (
                      <p>Carregando itens...</p>
                    ) : (
                      <table className="details-table">
                        <thead>
                          <tr>
                            <th>Produto</th>
                            <th>Qtd</th>
                            <th>Preço</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.items.map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.products?.name}</td>
                              <td>{Number(item.quantity).toFixed(item.products?.unit_type === 'KG' ? 3 : 0)} {item.products?.unit_type}</td>
                              <td>R$ {Number(item.unit_price).toFixed(2)}</td>
                              <td>R$ {Number(item.subtotal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="sale-admin-actions">
                      {deletingSaleId === sale.id ? (
                        <div className="delete-confirmation-alert animate-shake">
                          <AlertCircle size={20} />
                          <span>Confirma a exclusão permanente desta venda?</span>
                          <div className="confirm-buttons">
                            <button className="btn-confirm yes" onClick={() => handleDeleteSale(sale)}>Sim, Excluir</button>
                            <button className="btn-confirm no" onClick={() => setDeletingSaleId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="btn-delete-sale" 
                          onClick={() => setDeletingSaleId(sale.id)}
                        >
                          <Trash2 size={18} />
                          Excluir Venda
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .sales-view { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .section-header { margin-bottom: 24px; }
        .section-header h1 { font-size: 2rem; font-weight: 900; color: var(--text-main); margin-bottom: 8px; }
        
        .filters-bar { 
          background: white; 
          padding: 16px; 
          border-radius: var(--radius-lg); 
          margin-bottom: 20px; 
          display: flex;
          justify-content: space-between;
        }
        .search-pill { 
          flex: 1; 
          max-width: 400px;
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 10px 18px; 
          background: #f8fafc;
          border-radius: 30px; 
          border: 1px solid var(--border);
        }
        .search-pill input { border: none; outline: none; background: transparent; flex: 1; font-weight: 600; }

        .sales-list { display: flex; flex-direction: column; gap: 12px; }
        .sale-card { 
          background: white; 
          border-radius: var(--radius-md); 
          border: 1px solid var(--border);
          overflow: hidden;
          transition: all 0.2s;
        }
        .sale-card.expanded { border-color: var(--primary); }
        
        .sale-summary { 
          padding: 16px 20px; 
          display: grid; 
          grid-template-columns: 1.5fr 1.5fr 1fr 1fr 40px;
          align-items: center;
          cursor: pointer;
          gap: 12px;
        }

        .sale-main-info { display: flex; flex-direction: column; gap: 4px; }
        .date-badge { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          font-size: 0.8rem; 
          font-weight: 700; 
          color: var(--text-muted); 
        }
        .sale-id { font-size: 0.7rem; color: #94a3b8; font-family: monospace; }
        
        .sale-customer, .sale-payment { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; }
        .sale-total { font-weight: 900; font-size: 1.1rem; color: var(--primary); text-align: right; }
        .sale-expand-icon { color: var(--text-muted); text-align: right; }

        .sale-details { padding: 20px; background: #f8fafc; border-top: 1px solid var(--border); }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .details-table th { text-align: left; font-size: 0.8rem; color: var(--text-muted); padding: 8px; border-bottom: 2px solid var(--border); }
        .details-table td { padding: 10px 8px; font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border); }

        .sale-admin-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
        .btn-delete-sale { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px 16px; 
          background: #fef2f2; 
          color: var(--error); 
          border: 1px solid #fee2e2;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-delete-sale:hover { background: var(--error); color: white; border-color: var(--error); }

        .delete-confirmation-alert {
          background: #fff5f5;
          border: 1px solid #feb2b2;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #c53030;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .confirm-buttons { display: flex; gap: 8px; }
        .btn-confirm { padding: 6px 12px; border-radius: 6px; border: none; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
        .btn-confirm.yes { background: var(--error); color: white; }
        .btn-confirm.no { background: white; border: 1px solid var(--border); color: var(--text-muted); }

        @media (max-width: 768px) {
          .sale-summary { 
            grid-template-columns: 1fr 1fr; 
            gap: 16px;
          }
          .sale-payment, .sale-expand-icon { display: none; }
          .sale-total { font-size: 1.25rem; grid-column: 2; grid-row: 1; }
        }
        
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default SalesView;
