import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { supabase } from '../../../config/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  AlertCircle,
  Trophy,
  Activity
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  addMonths, 
  startOfYear, 
  endOfYear,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfDay,
  endOfDay,
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterMode = 'monthly' | 'annual' | 'custom';

const DashboardCharts: React.FC = () => {
  const [filterMode, setFilterMode] = useState<FilterMode>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [financeData, setFinanceData] = useState<any[]>([]);
  const [productRanking, setProductRanking] = useState<{ mostSold: any[], leastSold: any[] }>({
    mostSold: [],
    leastSold: []
  });
  const [pendingBySupplier, setPendingBySupplier] = useState<any[]>([]);
  const [debtorsRank, setDebtorsRank] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [filterMode, currentDate, customRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    let startDate: Date;
    let endDate: Date;

    if (filterMode === 'monthly') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    } else if (filterMode === 'annual') {
      startDate = startOfYear(currentDate);
      endDate = endOfYear(currentDate);
    } else {
      startDate = startOfDay(parseISO(customRange.start));
      endDate = endOfDay(parseISO(customRange.end));
    }

    try {
      // 1. Sales Data
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 2. Purchases (Accounts) - Joined with suppliers
      const { data: purchases } = await supabase
        .from('purchases')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 3. Sale Items for Ranking
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*, products(name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 4. Debtors List (Current state, not filtered by date)
      const { data: debtors } = await supabase
        .from('customers')
        .select('name, total_debt')
        .gt('total_debt', 0)
        .order('total_debt', { ascending: false })
        .limit(10);

      setDebtorsRank(debtors || []);
      processChartData(sales || [], purchases || [], saleItems || [], startDate, endDate);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (sales: any[], purchases: any[], saleItems: any[], start: Date, end: Date) => {
    // Process Sales & Finance by day or month depending on mode
    if (filterMode === 'monthly' || filterMode === 'custom') {
      const days = eachDayOfInterval({ start, end });
      const chartData = days.map(day => {
        const daySales = sales.filter(s => isSameDay(parseISO(s.created_at), day));
        const totalSales = daySales.reduce((acc, s) => acc + Number(s.total_amount), 0);
        
        const dayPurchases = purchases.filter(p => isSameDay(parseISO(p.created_at), day));
        const paid = dayPurchases.filter(p => p.status === 'PAID').reduce((acc, p) => acc + Number(p.total_amount), 0);
        const pending = dayPurchases.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + Number(p.total_amount), 0);

        return {
          name: format(day, 'dd/MM'),
          vendas: totalSales,
          pago: paid,
          pendente: pending
        };
      });
      setFinanceData(chartData);
    } else {
      // Annual mode - group by month
      const months = eachMonthOfInterval({ start, end });
      const chartData = months.map(month => {
        const monthSales = sales.filter(s => {
          const d = parseISO(s.created_at);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        });
        const totalSales = monthSales.reduce((acc, s) => acc + Number(s.total_amount), 0);

        const monthPurchases = purchases.filter(p => {
          const d = parseISO(p.created_at);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        });
        const paid = monthPurchases.filter(p => p.status === 'PAID').reduce((acc, p) => acc + Number(p.total_amount), 0);
        const pending = monthPurchases.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + Number(p.total_amount), 0);

        return {
          name: format(month, 'MMM', { locale: ptBR }),
          vendas: totalSales,
          pago: paid,
          pendente: pending
        };
      });
      setFinanceData(chartData);
    }

    // Process Pending by Supplier
    const supplierMap: Record<string, number> = {};
    purchases.filter(p => p.status === 'PENDING').forEach(p => {
      const name = p.suppliers?.name || 'Sem Fornecedor';
      supplierMap[name] = (supplierMap[name] || 0) + Number(p.total_amount);
    });
    const sortedSuppliers = Object.entries(supplierMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    setPendingBySupplier(sortedSuppliers);

    // Process Product Ranking
    const productMap: Record<string, { name: string; quantity: number }> = {};
    saleItems.forEach(item => {
      const prodId = item.product_id;
      if (!productMap[prodId]) {
        productMap[prodId] = { name: item.products?.name || 'Desconhecido', quantity: 0 };
      }
      productMap[prodId].quantity += Number(item.quantity);
    });

    const sortedProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
    setProductRanking({
      mostSold: sortedProducts.slice(0, 5),
      leastSold: sortedProducts.slice(-5).reverse()
    });
  };

  return (
    <div className="charts-wrapper">
      <div className="filters-bar glass">
        <div className="filter-modes">
          <button 
            className={`filter-btn ${filterMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setFilterMode('monthly')}
          >
            Mensal
          </button>
          <button 
            className={`filter-btn ${filterMode === 'annual' ? 'active' : ''}`}
            onClick={() => setFilterMode('annual')}
          >
            Anual
          </button>
          <button 
            className={`filter-btn ${filterMode === 'custom' ? 'active' : ''}`}
            onClick={() => setFilterMode('custom')}
          >
            Personalizado
          </button>
        </div>

        <div className="date-controls">
          {filterMode !== 'custom' ? (
            <div className="nav-controls">
              <button className="nav-btn" onClick={() => setCurrentDate(subMonths(currentDate, filterMode === 'annual' ? 12 : 1))}>
                <ChevronLeft size={20} />
              </button>
              <span className="current-date-label">
                {filterMode === 'monthly' 
                  ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                  : format(currentDate, 'yyyy')}
              </span>
              <button className="nav-btn" onClick={() => setCurrentDate(addMonths(currentDate, filterMode === 'annual' ? 12 : 1))}>
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            <div className="range-inputs">
              <input 
                type="date" 
                value={customRange.start} 
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="date-input"
              />
              <span>até</span>
              <input 
                type="date" 
                value={customRange.end} 
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="date-input"
              />
            </div>
          )}
        </div>
      </div>

      <div className="charts-grid">
        {/* Sales Wave Chart */}
        <div className="chart-card glass full-width">
          <div className="chart-header">
            <div className="flex items-center gap-3">
              <TrendingUp size={24} className="text-accent" />
              <div>
                <h3>Desempenho de Vendas</h3>
                <p className="text-xs text-muted-foreground">Volume de vendas diárias e picos de demanda</p>
              </div>
            </div>
          </div>
          <div className="chart-container sales-wave">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={financeData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(255,255,255,0.95)', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="var(--accent)" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    activeDot={{ r: 8, strokeWidth: 0, fill: 'var(--accent)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Debtors Chart - New Section */}
        <div className="chart-card glass full-width">
          <div className="chart-header">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-red" />
              <div>
                <h3>Maiores Devedores (Fiado)</h3>
                <p className="text-xs text-muted-foreground">Clientes com maiores valores pendentes de pagamento (Top 10)</p>
              </div>
            </div>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : debtorsRank.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={debtorsRank}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.02)'}}
                    contentStyle={{ 
                      background: 'white', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                    }}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Dívida Total']}
                  />
                  <Bar 
                    dataKey="total_debt" 
                    fill="#ef4444" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    label={{ 
                      position: 'right', 
                      formatter: (val: any) => `R$ ${Number(val).toFixed(2)}`,
                      fontSize: 11,
                      fontWeight: 700,
                      fill: '#ef4444'
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-chart">
                <AlertCircle size={40} className="text-green-500 mb-2" />
                <p>Nenhum cliente com fiado pendente</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Details: Paid vs Pending & Top Suppliers */}
        <div className="chart-card glass">
          <div className="chart-header">
            <div className="flex gap-2">
              <Activity size={20} className="text-blue" />
              <h3>Fluxo Financeiro de Compras</h3>
            </div>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={financeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} hide />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="pago" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pago" />
                    <Bar dataKey="pendente" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pendente" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="suppliers-summary mt-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <AlertCircle size={16} className="text-red" />
                    Pendências por Fornecedor
                  </h4>
                  <div className="suppliers-list">
                    {pendingBySupplier.length > 0 ? (
                      pendingBySupplier.slice(0, 3).map((sup, idx) => (
                        <div key={idx} className="supplier-item">
                          <span className="sup-name">{sup.name}</span>
                          <span className="sup-amount">R$ {sup.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted italic">Nenhuma pendência encontrada</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Unified Product Ranking */}
        <div className="chart-card glass">
          <div className="chart-header">
            <div className="flex gap-2">
              <Trophy size={20} className="text-yellow" />
              <h3>Ranking de Produtos</h3>
            </div>
          </div>
          <div className="chart-container unified-ranking">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <div className="ranking-split">
                <div className="ranking-section">
                  <h4 className="ranking-title most">Mais Vendidos</h4>
                  {productRanking.mostSold.map((prod, idx) => (
                    <div key={idx} className="rank-item">
                      <div className="rank-info">
                        <span className="rank-pos">#{idx + 1}</span>
                        <span className="rank-name">{prod.name}</span>
                      </div>
                      <span className="rank-qty">{prod.quantity} un</span>
                    </div>
                  ))}
                </div>
                <div className="ranking-divider" />
                <div className="ranking-section">
                  <h4 className="ranking-title least">Menos Vendidos</h4>
                  {productRanking.leastSold.map((prod, idx) => (
                    <div key={idx} className="rank-item">
                      <div className="rank-info">
                        <span className="rank-pos">#{idx + 1}</span>
                        <span className="rank-name">{prod.name}</span>
                      </div>
                      <span className="rank-qty">{prod.quantity} un</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .charts-wrapper { display: flex; flex-direction: column; gap: 24px; }
        
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-radius: var(--radius-lg);
          gap: 20px;
          flex-wrap: wrap;
        }

        .glass {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
        }

        .filter-modes { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 12px; }
        .filter-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn.active { background: white; color: var(--accent); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

        .date-controls { display: flex; align-items: center; gap: 16px; }
        .nav-controls { display: flex; align-items: center; gap: 12px; }
        .nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
        }
        .nav-btn:hover { background: #f8fafc; color: var(--accent); }
        .current-date-label { font-size: 1rem; font-weight: 700; color: #1e293b; text-transform: capitalize; min-width: 140px; text-align: center; }

        .range-inputs { display: flex; align-items: center; gap: 8px; }
        .date-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.85rem;
          color: #1e293b;
          outline: none;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .chart-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: transform 0.3s ease;
        }
        .chart-card:hover { transform: translateY(-4px); }
        .chart-card.full-width { grid-column: 1 / -1; }

        .chart-header { display: flex; flex-direction: column; gap: 4px; }
        .chart-header h3 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px; }

        .suppliers-summary { 
          background: #f8fafc; 
          padding: 16px; 
          border-radius: 12px; 
          border: 1px solid #e2e8f0; 
        }
        .supplier-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .supplier-item:last-child { border: none; }
        .sup-name { font-size: 0.85rem; font-weight: 600; color: #475569; }
        .sup-amount { font-size: 0.85rem; font-weight: 700; color: #ef4444; }

        .ranking-split { display: flex; gap: 24px; }
        .ranking-section { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .ranking-title { font-size: 0.9rem; font-weight: 800; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid; }
        .ranking-title.most { color: #f59e0b; border-color: #fef3c7; }
        .ranking-title.least { color: #6366f1; border-color: #e0e7ff; }

        .rank-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .rank-info { display: flex; gap: 10px; align-items: center; }
        .rank-pos { font-size: 0.75rem; font-weight: 800; color: #94a3b8; background: #f1f5f9; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .rank-name { font-size: 0.85rem; font-weight: 600; color: #334155; }
        .rank-qty { font-size: 0.85rem; font-weight: 700; color: var(--accent); }

        .ranking-divider { width: 1px; background: #e2e8f0; }

        .text-accent { color: var(--accent); }
        .text-red { color: #ef4444; }
        .text-blue { color: #3b82f6; }
        .text-yellow { color: #f59e0b; }

        .empty-state-chart {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 600;
        }

        .text-green-500 { color: #22c55e; }

        .empty-state-chart {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 600;
        }

        .text-green-500 { color: #22c55e; }

        .loading-placeholder {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-weight: 500;
          font-style: italic;
          background: rgba(241, 245, 249, 0.5);
          border-radius: 12px;
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        @media (max-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr; }
          .ranking-split { flex-direction: column; }
          .ranking-divider { height: 1px; width: 100%; }
        }

        @media (max-width: 768px) {
          .filters-bar { flex-direction: column; align-items: stretch; padding: 12px; }
          .filter-modes { justify-content: space-between; }
          .date-controls { justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default DashboardCharts;
