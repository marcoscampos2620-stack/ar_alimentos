import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Search, 
  Trash2, 
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval,
  getYear,
  getMonth,
  getDate
} from 'date-fns';
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

type Period = 'monthly' | 'yearly' | 'all' | 'custom';

const SalesView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  
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

  const filterByPeriod = (date: Date) => {
    const now = new Date();
    if (period === 'monthly') {
      return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    }
    if (period === 'yearly') {
      return isWithinInterval(date, { start: startOfYear(now), end: endOfYear(now) });
    }
    if (period === 'custom') {
      if (!customRange.start || !customRange.end) return true;
      try {
        const start = new Date(customRange.start + 'T00:00:00');
        const end = new Date(customRange.end + 'T23:59:59');
        return isWithinInterval(date, { start, end });
      } catch (e) {
        return true;
      }
    }
    return true;
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const date = parseISO(s.created_at);
      const matchesPeriod = period === 'all' ? true : filterByPeriod(date);
      
      const term = searchTerm.toLowerCase();
      const matchesId = s.id.toLowerCase().includes(term);
      const matchesCustomer = s.customers?.name.toLowerCase().includes(term);
      
      return matchesPeriod && (matchesId || matchesCustomer);
    });
  }, [sales, searchTerm, period, customRange]);

  const totalPeriod = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + Number(sale.total_amount), 0);
  }, [filteredSales]);

  // Grouping logic
  const groupedSales = useMemo(() => {
    const years: Record<number, any> = {};

    filteredSales.forEach(sale => {
      const date = parseISO(sale.created_at);
      const year = getYear(date);
      const monthIndex = getMonth(date);
      const day = getDate(date);
      
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const monthKey = `${year}-${monthIndex}`;
      const dayKey = `${year}-${monthIndex}-${day}`;

      if (!years[year]) {
        years[year] = { total: 0, months: {} };
      }
      years[year].total += Number(sale.total_amount);

      if (!years[year].months[monthKey]) {
        years[year].months[monthKey] = { name: monthName, total: 0, days: {} };
      }
      years[year].months[monthKey].total += Number(sale.total_amount);

      if (!years[year].months[monthKey].days[dayKey]) {
        years[year].months[monthKey].days[dayKey] = { day, total: 0, sales: [] };
      }
      years[year].months[monthKey].days[dayKey].total += Number(sale.total_amount);
      years[year].months[monthKey].days[dayKey].sales.push(sale);
    });

    return years;
  }, [filteredSales]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const toggleExpandSale = (saleId: string) => {
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
      await supabase.from('sale_items').delete().eq('sale_id', sale.id);
      const saleRef = `Venda #${sale.id.slice(0, 8)}`;
      await supabase.from('stock_movements').delete().eq('reason', saleRef);
      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      
      if (error) throw error;
      
      setDeletingSaleId(null);
      fetchSales();
    } catch (error: any) {
      alert('Erro ao excluir venda: ' + error.message);
    }
  };

  const periodLabels: Record<Period, string> = {
    monthly: 'Este Mês',
    yearly: 'Este Ano',
    all: 'Tudo',
    custom: 'Período Personalizado'
  };

  return (
    <div className="sales-view fade-in">
      <div className="section-header">
        <h1>Histórico de Vendas</h1>
        <p>Acompanhe e gerencie todas as transações realizadas no PDV</p>
      </div>

      <div className="kpi-banner shadow-premium">
        <div className="kpi-icon">
          <DollarSign size={32} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Vendas ({periodLabels[period]})</span>
          <span className="kpi-value">R$ {totalPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="kpi-trend">
          <Filter size={20} />
          <span>Filtro Ativo</span>
        </div>
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

        <div className="period-toggle">
          {(['monthly', 'yearly', 'all', 'custom'] as Period[]).map((p) => (
            <button 
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'monthly' ? 'Mês' : p === 'yearly' ? 'Ano' : p === 'all' ? 'Tudo' : p === 'custom' ? 'Personalizado' : ''}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="custom-date-range animate-fade-in">
          <div className="date-input-group">
            <label>Início</label>
            <input 
              type="date" 
              value={customRange.start} 
              onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="date-input-group">
            <label>Fim</label>
            <input 
              type="date" 
              value={customRange.end} 
              onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="sales-accordion-container">
        {loading ? (
          <div className="loading-placeholder">Carregando transações...</div>
        ) : Object.keys(groupedSales).length === 0 ? (
          <div className="empty-state">Nenhuma venda encontrada para o período selecionado.</div>
        ) : (
          Object.entries(groupedSales).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearData]: [string, any]) => (
            <div key={year} className="accordion-year">
              <div className="accordion-header year" onClick={() => toggleYear(Number(year))}>
                <div className="header-main">
                  <ChevronRight size={20} className={expandedYears[Number(year)] ? 'rotate-90' : ''} />
                  <span>{year}</span>
                </div>
                <div className="header-total">R$ {yearData.total.toFixed(2)}</div>
              </div>

              {expandedYears[Number(year)] && (
                <div className="accordion-content year">
                  {Object.entries(yearData.months).sort((a: any, b: any) => {
                    const monthA = parseInt(a[0].split('-')[1]);
                    const monthB = parseInt(b[0].split('-')[1]);
                    return monthB - monthA;
                  }).map(([monthKey, monthData]: [string, any]) => (
                    <div key={monthKey} className="accordion-month">
                      <div className="accordion-header month" onClick={() => toggleMonth(monthKey)}>
                        <div className="header-main">
                          <ChevronRight size={18} className={expandedMonths[monthKey] ? 'rotate-90' : ''} />
                          <span className="capitalize">{monthData.name}</span>
                        </div>
                        <div className="header-total">R$ {monthData.total.toFixed(2)}</div>
                      </div>

                      {expandedMonths[monthKey] && (
                        <div className="accordion-content month">
                          {Object.entries(monthData.days).sort((a: any, b: any) => Number(b[0].split('-')[2]) - Number(a[0].split('-')[2])).map(([dayKey, dayData]: [string, any]) => (
                            <div key={dayKey} className="accordion-day">
                              <div className="accordion-header day" onClick={() => toggleDay(dayKey)}>
                                <div className="header-main">
                                  <ChevronRight size={16} className={expandedDays[dayKey] ? 'rotate-90' : ''} />
                                  <span>Dia {dayData.day}</span>
                                </div>
                                <div className="header-total">R$ {dayData.total.toFixed(2)}</div>
                              </div>

                              {expandedDays[dayKey] && (
                                <div className="accordion-content day">
                                  {dayData.sales.map((sale: Sale) => (
                                    <div key={sale.id} className={`sale-card-compact shadow-sm ${expandedSaleId === sale.id ? 'expanded' : ''}`}>
                                      <div className="sale-summary-compact" onClick={() => toggleExpandSale(sale.id)}>
                                        <div className="sale-info-compact">
                                          <span className="sale-time">{format(parseISO(sale.created_at), 'HH:mm')}</span>
                                          <span className="sale-customer-compact">{sale.customers?.name || 'Cliente Casual'}</span>
                                        </div>
                                        <div className="sale-payment-compact">{sale.payment_method}</div>
                                        <div className="sale-total-compact">R$ {Number(sale.total_amount).toFixed(2)}</div>
                                      </div>

                                      {expandedSaleId === sale.id && (
                                        <div className="sale-details-premium">
                                          <div className="items-list-premium">
                                            {sale.items?.map((item: any) => (
                                              <div key={item.id} className="item-row-premium">
                                                <div className="item-name">{item.products?.name}</div>
                                                <div className="item-qty">{Number(item.quantity).toFixed(item.products?.unit_type === 'KG' ? 3 : 0)} {item.products?.unit_type}</div>
                                                <div className="item-price">R$ {Number(item.unit_price).toFixed(2)}</div>
                                                <div className="item-subtotal">R$ {Number(item.subtotal).toFixed(2)}</div>
                                              </div>
                                            ))}
                                          </div>
                                          {isAdmin && (
                                            <div className="admin-actions-premium">
                                              {deletingSaleId === sale.id ? (
                                                <div className="delete-confirm">
                                                  <span>Excluir permanentemente?</span>
                                                  <button className="btn-yes" onClick={() => handleDeleteSale(sale)}>Sim</button>
                                                  <button className="btn-no" onClick={() => setDeletingSaleId(null)}>Não</button>
                                                </div>
                                              ) : (
                                                <button className="btn-delete" onClick={() => setDeletingSaleId(sale.id)}>
                                                  <Trash2 size={16} /> Excluir
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .sales-view { padding: 20px; max-width: 1000px; margin: 0 auto; }
        .section-header { margin-bottom: 24px; text-align: center; }
        .section-header h1 { font-size: 2.5rem; font-weight: 900; color: var(--text-main); letter-spacing: -1px; }
        
        .kpi-banner {
          background: linear-gradient(135deg, var(--primary) 0%, #1565c0 100%);
          border-radius: 20px;
          padding: 24px;
          color: white;
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 30px;
          transition: transform 0.3s;
          box-shadow: 0 20px 40px rgba(30, 136, 229, 0.25);
        }
        .kpi-icon {
          background: rgba(255, 255, 255, 0.2);
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-info { flex: 1; display: flex; flex-direction: column; }
        .kpi-label { font-size: 0.9rem; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
        .kpi-value { font-size: 2.2rem; font-weight: 900; }
        .kpi-trend { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; background: rgba(0,0,0,0.1); padding: 8px 16px; border-radius: 30px; }

        .filters-bar { 
          display: flex; 
          gap: 16px; 
          margin-bottom: 24px; 
          align-items: center;
          flex-wrap: wrap;
        }
        .search-pill { 
          flex: 1; 
          min-width: 250px;
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 12px 20px; 
          background: white; 
          border-radius: 16px; 
          border: 1px solid var(--border);
        }
        .search-pill input { border: none; outline: none; background: transparent; flex: 1; font-weight: 600; color: var(--text-main); }
        
        .period-toggle { 
          display: flex; 
          background: white; 
          padding: 4px; 
          border-radius: 12px; 
          border: 1px solid var(--border);
        }
        .period-btn { 
          padding: 8px 16px; 
          border-radius: 10px; 
          font-weight: 700; 
          font-size: 0.85rem; 
          color: var(--text-muted);
          transition: 0.2s;
        }
        .period-btn.active { background: var(--primary); color: white; }

        .custom-date-range {
          display: flex;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 24px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }
        .date-input-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .date-input-group label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        .date-input-group input { padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-weight: 700; outline: none; color: var(--primary); }

        .sales-accordion-container { display: flex; flex-direction: column; gap: 8px; }
        
        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: white;
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: 0.2s;
        }
        .accordion-header:hover { background: #f8fafc; border-color: var(--primary); }
        .accordion-header .header-main { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.1rem; }
        .accordion-header.year { background: #f1f5f9; }
        .accordion-header.month { margin-left: 20px; background: #fff; }
        .accordion-header.day { margin-left: 40px; background: #fff; border-style: dashed; }
        
        .header-total { font-weight: 900; color: var(--primary); }
        
        .rotate-90 { transform: rotate(90deg); transition: 0.3s; }
        
        .accordion-content { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
        
        .sale-card-compact { 
          margin-left: 60px; 
          background: white; 
          border-radius: 10px; 
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .sale-summary-compact { 
          padding: 12px 16px; 
          display: grid; 
          grid-template-columns: 2fr 1fr 1fr;
          align-items: center;
          cursor: pointer;
        }
        .sale-info-compact { display: flex; align-items: center; gap: 12px; }
        .sale-time { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
        .sale-customer-compact { font-weight: 700; font-size: 0.9rem; }
        .sale-payment-compact { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
        .sale-total-compact { font-weight: 800; text-align: right; color: var(--text-main); }

        .sale-details-premium { padding: 16px; background: #f8fafc; border-top: 1px solid var(--border); }
        .items-list-premium { display: flex; flex-direction: column; gap: 4px; }
        .item-row-premium { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 0.85rem; padding: 4px 8px; border-bottom: 1px solid var(--border-light, #eee); }
        .item-name { font-weight: 700; }
        .item-qty, .item-price, .item-subtotal { text-align: right; color: var(--text-muted); font-weight: 600; }
        .item-subtotal { color: var(--text-main); font-weight: 700; }

        .admin-actions-premium { margin-top: 12px; display: flex; justify-content: flex-end; }
        .btn-delete { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #fff1f2; color: #e11d48; border-radius: 6px; border: 1px solid #ffe4e6; font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-delete:hover { background: #e11d48; color: white; }
        
        .delete-confirm { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; font-weight: 700; color: #e11d48; }
        .btn-yes { background: #e11d48; color: white; padding: 4px 8px; border-radius: 4px; border: none; font-weight: 800; }
        .btn-no { background: #f1f5f9; color: var(--text-muted); padding: 4px 8px; border-radius: 4px; border: none; font-weight: 800; }

        .capitalize { text-transform: capitalize; }
        .shadow-premium { box-shadow: 0 10px 25px -5px rgba(30, 136, 229, 0.2), 0 8px 10px -6px rgba(30, 136, 229, 0.2); }

        @media (max-width: 768px) {
          .section-header h1 { font-size: 1.8rem; }
          .kpi-banner { padding: 16px; gap: 12px; margin-bottom: 20px; border-radius: 16px; }
          .kpi-icon { width: 44px; height: 44px; }
          .kpi-icon svg { width: 24px; height: 24px; }
          .kpi-value { font-size: 1.5rem; }
          .kpi-label { font-size: 0.75rem; }
          .kpi-trend { display: none; }
          
          .custom-date-range { flex-direction: column; gap: 12px; padding: 12px; }
          .date-input-group input { padding: 8px; }

          .accordion-header.month { margin-left: 10px; }
          .accordion-header.day { margin-left: 20px; }
          .sale-card-compact { margin-left: 30px; }
          .sale-summary-compact { grid-template-columns: 1fr 1fr; }
          .sale-payment-compact { display: none; }
          .item-row-premium { grid-template-columns: 1fr 1fr; gap: 8px; }
          .item-price { display: none; }
        }
      `}</style>
    </div>
  );
};

export default SalesView;
