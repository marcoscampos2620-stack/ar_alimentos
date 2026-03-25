import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  ChevronRight, 
  Search,
  Filter,
  Truck
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
import PurchaseEntry from './PurchaseEntry';

interface Purchase {
  id: string;
  supplier: { name: string };
  total_amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'PENDING' | 'PAID';
  created_at: string;
  description?: string;
}

type Period = 'monthly' | 'yearly' | 'all' | 'custom';

const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, supplier:suppliers(name)')
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      setPurchases(data as any || []);
    } catch (error: any) {
      alert('Erro ao carregar compras: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async (purchase: Purchase) => {
    const newStatus = purchase.status === 'PENDING' ? 'PAID' : 'PENDING';
    const payDate = newStatus === 'PAID' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus, payment_date: payDate })
        .eq('id', purchase.id);

      if (error) throw error;
      fetchPurchases();
    } catch (error: any) {
      alert('Erro ao atualizar status: ' + error.message);
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

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const date = parseISO(p.due_date);
      const matchesPeriod = period === 'all' ? true : filterByPeriod(date);
      
      const term = searchTerm.toLowerCase();
      const matchesSupplier = p.supplier?.name.toLowerCase().includes(term);
      const matchesDescription = p.description?.toLowerCase().includes(term);
      
      return matchesPeriod && (matchesSupplier || matchesDescription || term === '');
    });
  }, [purchases, searchTerm, period, customRange]);

  const totalPeriod = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + Number(p.total_amount), 0);
  }, [filteredPurchases]);

  const groupedPurchases = useMemo(() => {
    const years: Record<number, any> = {};

    filteredPurchases.forEach(purchase => {
      const date = parseISO(purchase.due_date);
      const year = getYear(date);
      const monthIndex = getMonth(date);
      const day = getDate(date);
      
      const monthName = format(date, 'MMMM', { locale: ptBR });
      const monthKey = `${year}-${monthIndex}`;
      const dayKey = `${year}-${monthIndex}-${day}`;

      if (!years[year]) {
        years[year] = { total: 0, months: {} };
      }
      years[year].total += Number(purchase.total_amount);

      if (!years[year].months[monthKey]) {
        years[year].months[monthKey] = { name: monthName, total: 0, days: {} };
      }
      years[year].months[monthKey].total += Number(purchase.total_amount);

      if (!years[year].months[monthKey].days[dayKey]) {
        years[year].months[monthKey].days[dayKey] = { day, total: 0, purchases: [] };
      }
      years[year].months[monthKey].days[dayKey].total += Number(purchase.total_amount);
      years[year].months[monthKey].days[dayKey].purchases.push(purchase);
    });

    return years;
  }, [filteredPurchases]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const periodLabels: Record<Period, string> = {
    monthly: 'Este Mês',
    yearly: 'Este Ano',
    all: 'Tudo',
    custom: 'Período Personalizado'
  };

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => setShowForm(false)}>
            <ArrowLeft size={20} />
          </button>
          <h2>Registrar Compra</h2>
        </div>
        <div className="form-view-content">
          <PurchaseEntry 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              fetchPurchases();
              setShowForm(false);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="purchases-view fade-in">
      <div className="section-header">
        <div className="header-flex">
          <div className="header-text">
            <h1>Compras de Fornecedores</h1>
            <p>Gerencie pedidos, fornecedores e pagamentos</p>
          </div>
          <button className="btn-add shadow-premium" onClick={() => setShowForm(true)}>
            <Plus size={20} /> Nova Compra
          </button>
        </div>
      </div>

      <div className="kpi-banner shadow-premium">
        <div className="kpi-icon">
          <Truck size={32} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Compras ({periodLabels[period]})</span>
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
            placeholder="Buscar fornecedor ou descrição..." 
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
          <div className="loading-placeholder">Carregando compras...</div>
        ) : Object.keys(groupedPurchases).length === 0 ? (
          <div className="empty-state">Nenhuma compra encontrada para o período selecionado.</div>
        ) : (
          Object.entries(groupedPurchases).sort(([a], [b]) => Number(b) - Number(a)).map(([year, yearData]: [string, any]) => (
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
                                  {dayData.purchases.map((purchase: Purchase) => (
                                    <div key={purchase.id} className={`sale-card-compact shadow-sm ${expandedId === purchase.id ? 'expanded' : ''}`}>
                                      <div className="sale-summary-compact" onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}>
                                        <div className="sale-info-compact">
                                          <span className="sale-time">{format(parseISO(purchase.created_at || purchase.due_date), 'HH:mm')}</span>
                                          <span className="sale-customer-compact">{purchase.supplier?.name}</span>
                                        </div>
                                        <div className={`status-badge ${purchase.status.toLowerCase()}`}>
                                          {purchase.status === 'PAID' ? 'Pago' : 'Pendente'}
                                        </div>
                                        <div className="sale-total-compact">R$ {Number(purchase.total_amount).toFixed(2)}</div>
                                      </div>

                                      {expandedId === purchase.id && (
                                        <div className="sale-details-premium">
                                          <div className="purchase-meta">
                                            <div className="meta-item">
                                              <span className="meta-label">Vencimento:</span>
                                              <span className="meta-value">{new Date(purchase.due_date).toLocaleDateString()}</span>
                                            </div>
                                            {purchase.description && (
                                              <div className="meta-item">
                                                <span className="meta-label">Descrição:</span>
                                                <span className="meta-value">{purchase.description}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="admin-actions-premium">
                                            <button 
                                              className={`btn-status ${purchase.status === 'PAID' ? 'paid' : 'pending'}`}
                                              onClick={() => handleTogglePayment(purchase)}
                                            >
                                              {purchase.status === 'PAID' ? <Clock size={14} /> : <CheckCircle size={14} />}
                                              {purchase.status === 'PAID' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                                            </button>
                                          </div>
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
        .purchases-view { padding: 20px; max-width: 1000px; margin: 0 auto; }
        .section-header { margin-bottom: 24px; text-align: center; }
        .section-header h1 { font-size: 2.5rem; font-weight: 900; color: var(--text-main); letter-spacing: -1px; }
        .section-header p { color: var(--text-muted); font-weight: 600; margin-top: 4px; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; text-align: left; }
        .btn-add { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #f59e0b; color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; border: none; }
        .btn-add:hover { background: #d97706; transform: translateY(-2px); }

        .kpi-banner {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 20px;
          padding: 24px;
          color: white;
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 30px;
          margin-top: 20px;
          transition: transform 0.3s;
          box-shadow: 0 20px 40px rgba(245, 158, 11, 0.25);
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
        .period-btn.active { background: #f59e0b; color: white; }

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
        .date-input-group input { padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-weight: 700; outline: none; color: #f59e0b; }

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
        .accordion-header:hover { background: #f8fafc; border-color: #f59e0b; }
        .accordion-header .header-main { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.1rem; }
        .accordion-header.year { background: #f1f5f9; }
        .accordion-header.month { margin-left: 20px; background: #fff; }
        .accordion-header.day { margin-left: 40px; background: #fff; border-style: dashed; }
        
        .header-total { font-weight: 900; color: #f59e0b; }
        
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .sale-info-compact { display: flex; align-items: center; gap: 12px; }
        .sale-time { font-size: 0.75rem; color: var(--text-muted); font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
        .sale-customer-compact { font-weight: 700; font-size: 0.9rem; }
        .sale-total-compact { font-weight: 800; text-align: right; color: var(--text-main); }

        .status-badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-align: center; }
        .status-badge.paid { background: #dcfce7; color: #166534; }
        .status-badge.pending { background: #fef9c3; color: #854d0e; }

        .sale-details-premium { padding: 16px; background: #f8fafc; border-top: 1px solid var(--border); }
        .purchase-meta { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .meta-item { display: flex; gap: 8px; font-size: 0.85rem; }
        .meta-label { font-weight: 800; color: var(--text-muted); }
        .meta-value { font-weight: 600; color: var(--text-main); }

        .admin-actions-premium { display: flex; justify-content: flex-end; }
        .btn-status { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: 0.2s; border: 1px solid var(--border); }
        .btn-status.paid { background: #f1f5f9; color: var(--text-muted); }
        .btn-status.pending { background: #10b981; color: white; border-color: #059669; }

        .form-header-v2 { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        .btn-back { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 8px; border-radius: 50%; transition: 0.2s; }
        .btn-back:hover { background: #f1f5f9; color: var(--primary); }

        .capitalize { text-transform: capitalize; }
        .shadow-premium { box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.2), 0 8px 10px -6px rgba(245, 158, 11, 0.2); }

        @media (max-width: 768px) {
          .section-header h1 { font-size: 1.8rem; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 12px; }
          .btn-add { width: 100%; justify-content: center; }
          
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
          .sale-card-compact { margin-left: 10px; }
          .sale-summary-compact { grid-template-columns: 1fr 1fr; }
          .status-badge { display: none; }
        }
      `}</style>
    </div>
  );
};

export default PurchasesView;
