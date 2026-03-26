import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from '../../config/supabase';
import { 
  Search, 
  Trash2, 
  ChevronRight,
  Filter,
  DollarSign,
  AlertTriangle,
  Edit
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
  sale_categories?: { name: string };
  items?: any[];
  invoice_number?: number;
  category_id?: string | null;
}

interface DebtKPI {
  totalPending: number;
  countPending: number;
  totalOverdue: number;
  countOverdue: number;
}

interface SaleCategory {
  id: string;
  name: string;
  created_at: string;
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
  const [debtKPI, setDebtKPI] = useState<DebtKPI>({ totalPending: 0, countPending: 0, totalOverdue: 0, countOverdue: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'categories'>('sales');
  
  // Categorias
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SaleCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  
  // Associação em Massa
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<'sales' | 'customers'>('sales');
  const [selectedBulkCategory, setSelectedBulkCategory] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchSales();
    fetchDebtKPI();
    fetchCustomers();
    fetchSaleCategories();

    const channel = supabase
      .channel('sales-history-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_debts' }, () => {
        fetchDebtKPI();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDebtKPI = async () => {
    const { data } = await supabase
      .from('customer_debts')
      .select('amount, due_date, status')
      .eq('status', 'PENDING');

    if (data) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let totalPending = 0;
      let totalOverdue = 0;
      let countOverdue = 0;

      data.forEach(d => {
        totalPending += Number(d.amount);
        const due = new Date(d.due_date + 'T23:59:59');
        if (due < today) {
          totalOverdue += Number(d.amount);
          countOverdue++;
        }
      });

      setDebtKPI({
        totalPending,
        countPending: data.length,
        totalOverdue,
        countOverdue
      });
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers(name),
          sale_categories(name)
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

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    if (data) setCustomers(data);
  };

  const fetchSaleCategories = async () => {
    setLoadingCategories(true);
    const { data } = await supabase.from('sale_categories').select('*').order('name');
    if (data) setSaleCategories(data);
    setLoadingCategories(false);
  };

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchSaleCategories();
    }
  }, [activeTab]);

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

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      if (editingCategory) {
        await supabase.from('sale_categories').update({ name: categoryName }).eq('id', editingCategory.id);
      } else {
        await supabase.from('sale_categories').insert([{ name: categoryName }]);
      }
      setCategoryName('');
      setEditingCategory(null);
      setShowCategoryModal(false);
      fetchSaleCategories();
    } catch (error: any) {
      alert('Erro ao salvar categoria: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('sale_categories').delete().eq('id', id);
      if (error) throw error;
      fetchSaleCategories();
    } catch (error: any) {
      alert('Erro ao excluir categoria. Verifique se existem vendas vinculadas.');
    }
  };

  const handleBulkSave = async () => {
    if (!selectedBulkCategory || selectedItems.length === 0) return;
    setIsBulkSaving(true);
    try {
      if (bulkType === 'sales') {
        const { error } = await supabase
          .from('sales')
          .update({ category_id: selectedBulkCategory })
          .in('id', selectedItems);
        if (error) throw error;
      } else {
        // Associar por cliente: buscar todas as vendas desses clientes e atualizar
        const { error } = await supabase
          .from('sales')
          .update({ category_id: selectedBulkCategory })
          .in('customer_id', selectedItems);
        if (error) throw error;
      }
      
      setShowBulkModal(false);
      setSelectedItems([]);
      fetchSales();
    } catch (error: any) {
      alert('Erro na associação em massa: ' + error.message);
    } finally {
      setIsBulkSaving(false);
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

  const handleUpdateSale = async (updatedData: Partial<Sale>) => {
    if (!editingSale) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          payment_method: updatedData.payment_method,
          customer_id: updatedData.customer_id,
          invoice_number: updatedData.invoice_number,
          total_amount: updatedData.total_amount,
          category_id: updatedData.category_id
        })
        .eq('id', editingSale.id);

      if (error) throw error;

      // Se mudou para fiado ou de fiado para outro, precisamos ajustar customer_debts
      // Por simplicidade neste MVP, vamos focar em editar os dados de cabeçalho
      // Avisaremos se houver impacto em fiados

      setEditingSale(null);
      fetchSales();
      fetchDebtKPI();
    } catch (error: any) {
      alert('Erro ao atualizar venda: ' + error.message);
    } finally {
      setUpdating(false);
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
      <div className="view-tabs">
        <button 
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Histórico de Vendas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categorias de Notas
        </button>
      </div>

      {activeTab === 'sales' ? (
        <>
          <div className="kpi-banner shadow-premium">
        <div className="kpi-icon">
          <DollarSign size={32} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Vendas ({periodLabels[period]})</span>
          <span className="kpi-value">{formatCurrency(totalPeriod)}</span>
        </div>
        <div className="kpi-trend">
          <Filter size={20} />
          <span>Filtro Ativo</span>
        </div>
      </div>

      <div className="debt-kpis-mini-row-sales animate-slide-up">
        <div className="kpi-mini-card pending">
          <div className="kpi-mini-info">
            <span className="kpi-mini-label">Fiado Pendente</span>
            <span className="kpi-mini-value">{formatCurrency(debtKPI.totalPending)}</span>
          </div>
          <span className="kpi-mini-count">{debtKPI.countPending} abertos</span>
        </div>

        <div className="kpi-mini-card overdue">
          <div className="kpi-mini-info">
            <span className="kpi-mini-label">Fiados Vencidos</span>
            <span className="kpi-mini-value">{formatCurrency(debtKPI.totalOverdue)}</span>
          </div>
          <span className="kpi-mini-count alert">
            <AlertTriangle size={10} />
            {debtKPI.countOverdue} vencidos
          </span>
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
                <div className="header-total">{formatCurrency(yearData.total)}</div>
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
                        <div className="header-total">{formatCurrency(monthData.total)}</div>
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
                                <div className="header-total">{formatCurrency(dayData.total)}</div>
                              </div>

                              {expandedDays[dayKey] && (
                                <div className="accordion-content day">
                                  {dayData.sales.map((sale: Sale) => (
                                    <div key={sale.id} className={`sale-card-compact shadow-sm ${expandedSaleId === sale.id ? 'expanded' : ''}`}>
                                      <div className="sale-summary-compact" onClick={() => toggleExpandSale(sale.id)}>
                                        <div className="sale-info-compact">
                                          <span className="sale-time">{format(parseISO(sale.created_at), 'HH:mm')}</span>
                                          <span className="sale-invoice">Nº {sale.invoice_number || '---'}</span>
                                          <span className="sale-customer-compact">{sale.customers?.name || 'Cliente Casual'}</span>
                                          {sale.sale_categories && (
                                            <span className="sale-category-badge">{sale.sale_categories.name}</span>
                                          )}
                                        </div>
                                        <div className="sale-payment-compact">{sale.payment_method}</div>
                                        <div className="sale-total-compact">{formatCurrency(sale.total_amount)}</div>
                                      </div>

                                      {expandedSaleId === sale.id && (
                                        <div className="sale-details-premium">
                                          <div className="items-list-premium">
                                            {sale.items?.map((item: any) => (
                                              <div key={item.id} className="item-row-premium">
                                                <div className="item-name">{item.products?.name}</div>
                                                <div className="item-qty">{Number(item.quantity).toFixed(item.products?.unit_type === 'KG' ? 3 : 0)} {item.products?.unit_type}</div>
                                                <div className="item-price">{formatCurrency(item.unit_price)}</div>
                                                <div className="item-subtotal">{formatCurrency(item.subtotal)}</div>
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
                                              <button className="btn-edit-sale" onClick={() => setEditingSale(sale)}>
                                                <Edit size={16} /> Editar
                                              </button>
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

      {editingSale && (
        <div className="modal-overlay fade-in">
          <div className="edit-sale-card slide-up shadow-xl">
            <div className="modal-header">
              <h3>Editar Venda #{editingSale.id.slice(0, 8)}</h3>
              <button onClick={() => setEditingSale(null)} className="btn-icon">×</button>
            </div>
            <div className="modal-content">
              <div className="input-group">
                <label>Número da Nota</label>
                <input 
                  type="number" 
                  value={editingSale.invoice_number || ''} 
                  onChange={(e) => setEditingSale({ ...editingSale, invoice_number: parseInt(e.target.value) })}
                />
              </div>
              <div className="input-group">
                <label>Cliente</label>
                <select 
                  value={editingSale.customer_id || ''} 
                  onChange={(e) => setEditingSale({ ...editingSale, customer_id: e.target.value || undefined })}
                >
                  <option value="">Consumidor Final</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Forma de Pagamento</label>
                <select 
                  value={editingSale.payment_method} 
                  onChange={(e) => setEditingSale({ ...editingSale, payment_method: e.target.value })}
                >
                  <option value="CASH">Dinheiro</option>
                  <option value="CARD">Cartão</option>
                  <option value="PIX">PIX</option>
                  <option value="DEBT">Fiado</option>
                </select>
              </div>
              <div className="input-group">
                <label>Categoria</label>
                <select 
                  value={editingSale.category_id || ''} 
                  onChange={(e) => setEditingSale({ ...editingSale, category_id: e.target.value || null })}
                >
                  <option value="">Sem Categoria</option>
                  {saleCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editingSale.total_amount} 
                  onChange={(e) => setEditingSale({ ...editingSale, total_amount: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary" 
                onClick={() => handleUpdateSale(editingSale)}
                disabled={updating}
              >
                {updating ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <div className="categories-tab-content fade-in">
          <div className="section-header-mini">
            <h2>Gerenciar Categorias</h2>
            <div className="header-actions">
              <button className="btn-primary" onClick={() => setShowBulkModal(true)}>
                <Filter size={18} /> Associação em Massa
              </button>
              <button className="btn-secondary" onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setShowCategoryModal(true);
              }}>
                Nova Categoria
              </button>
            </div>
          </div>

          <div className="categories-grid">
            {loadingCategories ? (
              <p>Carregando categorias...</p>
            ) : saleCategories.length === 0 ? (
              <p className="empty-state">Nenhuma categoria cadastrada.</p>
            ) : (
              saleCategories.map(cat => (
                <div key={cat.id} className="category-card shadow-sm">
                  <span className="category-name">{cat.name}</span>
                  <div className="category-actions">
                    <button className="btn-icon" onClick={() => {
                      setEditingCategory(cat);
                      setCategoryName(cat.name);
                      setShowCategoryModal(true);
                    }}>
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon delete" onClick={() => handleDeleteCategory(cat.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Categoria */}
      {showCategoryModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-card shadow-xl">
            <div className="modal-header">
              <h3>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="btn-close">×</button>
            </div>
            <div className="modal-content">
              <div className="input-group">
                <label>Nome da Categoria</label>
                <input 
                  type="text" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Rota Sul, Pronta Entrega..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={handleSaveCategory}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Associação em Massa */}
      {showBulkModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-card wide shadow-xl">
            <div className="modal-header">
              <h3>Associação em Massa</h3>
              <button onClick={() => setShowBulkModal(false)} className="btn-close">×</button>
            </div>
            <div className="modal-content">
              <div className="bulk-selectors">
                <div className="input-group">
                  <label>Tipo de Associação</label>
                  <select value={bulkType} onChange={(e) => {
                    setBulkType(e.target.value as any);
                    setSelectedItems([]);
                  }}>
                    <option value="sales">Vendas Individuais</option>
                    <option value="customers">Todos os pedidos por Cliente</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Categoria Destino</label>
                  <select value={selectedBulkCategory} onChange={(e) => setSelectedBulkCategory(e.target.value)}>
                    <option value="">Selecione...</option>
                    {saleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bulk-list">
                <label>{bulkType === 'sales' ? 'Selecione as Vendas' : 'Selecione os Clientes'}</label>
                <div className="items-selector-grid">
                  {bulkType === 'sales' ? (
                    sales.slice(0, 50).map(s => (
                      <label key={s.id} className={`selector-item ${selectedItems.includes(s.id) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItems([...selectedItems, s.id]);
                            else setSelectedItems(selectedItems.filter(id => id !== s.id));
                          }}
                        />
                        <div className="item-info">
                          <span className="main">{s.customers?.name || 'Casual'}</span>
                          <span className="sub">Nº {s.invoice_number} - {formatCurrency(s.total_amount)}</span>
                        </div>
                      </label>
                    ))
                  ) : (
                    customers.map(c => (
                      <label key={c.id} className={`selector-item ${selectedItems.includes(c.id) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItems([...selectedItems, c.id]);
                            else setSelectedItems(selectedItems.filter(id => id !== c.id));
                          }}
                        />
                        <div className="item-info">
                          <span className="main">{c.name}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary" 
                disabled={!selectedBulkCategory || selectedItems.length === 0 || isBulkSaving}
                onClick={handleBulkSave}
              >
                {isBulkSaving ? 'Processando...' : `Associar ${selectedItems.length} itens`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .view-tabs { display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 2px solid var(--border); padding-bottom: 2px; }
        .tab-btn { padding: 10px 20px; font-weight: 800; color: var(--text-muted); background: none; border: none; cursor: pointer; transition: 0.2s; position: relative; }
        .tab-btn.active { color: var(--primary); }
        .tab-btn.active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 3px; background: var(--primary); border-radius: 3px; }

        .section-header-mini { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .header-actions { display: flex; gap: 12px; }
        
        .categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .category-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .category-name { font-weight: 700; color: var(--text-main); }
        .category-actions { display: flex; gap: 4px; }
        .btn-icon.delete:hover { color: var(--error); }

        .modal-card { background: white; border-radius: 20px; width: 90%; max-width: 400px; overflow: hidden; }
        .modal-card.wide { max-width: 700px; }
        .btn-close { font-size: 1.5rem; background: none; border: none; cursor: pointer; color: var(--text-muted); }
        
        .bulk-selectors { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .bulk-list label { font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin-bottom: 10px; display: block; }
        .items-selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto; padding: 10px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border); }
        .selector-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: white; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .selector-item:hover { border-color: var(--primary); }
        .selector-item.selected { border-color: var(--primary); background: #eff6ff; }
        .selector-item input { width: 18px; height: 18px; }
        .item-info { display: flex; flex-direction: column; }
        .item-info .main { font-weight: 700; font-size: 0.85rem; }
        .item-info .sub { font-size: 0.7rem; color: var(--text-muted); }

        .sale-category-badge { font-size: 0.65rem; font-weight: 800; color: white; background: var(--primary); padding: 2px 8px; border-radius: 20px; text-transform: uppercase; }

        .btn-secondary { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 700; color: var(--text-main); cursor: pointer; }
        
        @media (max-width: 768px) {
          .bulk-selectors { grid-template-columns: 1fr; }
          .view-tabs { font-size: 0.8rem; }
        }
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

        /* Mini KPIs Row (Sales) */
        .debt-kpis-mini-row-sales {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .kpi-mini-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }
        .kpi-mini-card:hover { transform: translateY(-2px); border-color: var(--primary); }

        .kpi-mini-info { display: flex; flex-direction: column; }
        .kpi-mini-label { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .kpi-mini-value { font-size: 1rem; font-weight: 800; color: var(--text-main); }
        
        .kpi-mini-count { 
          font-size: 0.7rem; 
          font-weight: 700; 
          padding: 4px 8px; 
          border-radius: 20px; 
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .overdue.kpi-mini-card { border-color: #fee2e2; }
        .kpi-mini-count.alert { background: #fee2e2; color: #dc2626; }
        .overdue .kpi-mini-value { color: #dc2626; }

        .sale-invoice { font-size: 0.75rem; font-weight: 800; color: var(--primary); background: #eef2ff; padding: 2px 8px; border-radius: 6px; }

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

        .btn-edit-sale {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 6px;
          border: 1px solid #dbeafe;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
          margin-left: 8px;
        }
        .btn-edit-sale:hover { background: #2563eb; color: white; }

        .edit-sale-card {
          width: 90%;
          max-width: 400px;
          background: white;
          border-radius: 20px;
          overflow: hidden;
        }
        .modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-weight: 800; margin: 0; }
        .modal-content { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        .input-group input, .input-group select { padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-weight: 700; outline: none; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
        
        @media (max-width: 768px) {
          .section-header h1 { font-size: 1.8rem; }
          .kpi-banner { padding: 16px; gap: 12px; margin-bottom: 20px; border-radius: 16px; }
          .kpi-icon { width: 44px; height: 44px; }
          .kpi-icon svg { width: 24px; height: 24px; }
          .kpi-value { font-size: 1.5rem; }
          .kpi-label { font-size: 0.75rem; }
          .kpi-trend { display: none; }
          
          .debt-kpis-mini-row-sales {
            gap: 8px;
            margin-bottom: 20px;
          }
          .kpi-mini-card {
            flex: 1;
            padding: 8px;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 6px;
            min-width: 0; /* allows flex box to shrink properly */
          }
          .kpi-mini-info { align-items: center; }
          .kpi-mini-label { font-size: 0.55rem; letter-spacing: 0; }
          .kpi-mini-value { font-size: 0.9rem; }
          .kpi-mini-count { font-size: 0.65rem; padding: 2px 6px; }
          
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
