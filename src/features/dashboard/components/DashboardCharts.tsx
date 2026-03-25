import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { supabase } from '../../../config/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowDownCircle, 
  ArrowUpCircle,
  PackageCheck,
  Filter
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
  const [stockStats, setStockStats] = useState<any[]>([]);
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

      // 2. Purchases (Accounts)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 3. Sale Items for Ranking
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*, products(name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 4. Stock Movements
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      processChartData(sales || [], purchases || [], saleItems || [], movements || [], startDate, endDate);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (sales: any[], purchases: any[], saleItems: any[], movements: any[], start: Date, end: Date) => {
    // Process Sales & Finance & Stock by day or month depending on mode
    if (filterMode === 'monthly' || filterMode === 'custom') {
      const days = eachDayOfInterval({ start, end });
      const chartData = days.map(day => {
        const daySales = sales.filter(s => isSameDay(parseISO(s.created_at), day));
        const totalSales = daySales.reduce((acc, s) => acc + Number(s.total_amount), 0);
        
        const dayPurchases = purchases.filter(p => isSameDay(parseISO(p.created_at), day));
        const paid = dayPurchases.filter(p => p.status === 'PAID').reduce((acc, p) => acc + Number(p.total_amount), 0);
        const pending = dayPurchases.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + Number(p.total_amount), 0);

        const dayMovements = movements.filter(m => isSameDay(parseISO(m.created_at), day));
        const entradas = dayMovements
          .filter(m => Number(m.quantity) > 0)
          .reduce((acc, m) => acc + Number(m.quantity), 0);
        const saidas = dayMovements
          .filter(m => Number(m.quantity) < 0)
          .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

        return {
          name: format(day, 'dd/MM'),
          vendas: totalSales,
          pago: paid,
          pendente: pending,
          entradas,
          saidas
        };
      });
      setFinanceData(chartData);
      setStockStats(chartData);
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

        const monthMovements = movements.filter(m => {
          const d = parseISO(m.created_at);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        });
        const entradas = monthMovements
          .filter(m => Number(m.quantity) > 0)
          .reduce((acc, m) => acc + Number(m.quantity), 0);
        const saidas = monthMovements
          .filter(m => Number(m.quantity) < 0)
          .reduce((acc, m) => acc + Math.abs(Number(m.quantity)), 0);

        return {
          name: format(month, 'MMM', { locale: ptBR }),
          vendas: totalSales,
          pago: paid,
          pendente: pending,
          entradas,
          saidas
        };
      });
      setFinanceData(chartData);
      setStockStats(chartData);
    }

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

  const COLORS = ['#4ade80', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa'];

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
        {/* Stock Movements Chart */}

        {/* Stock Movements Chart */}
        <div className="chart-card glass">
          <div className="chart-header">
            <PackageCheck size={20} className="text-purple" />
            <h3>Movimentação de Estoque (Qtd)</h3>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none' }}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#4ade80" radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill="#f87171" radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Financial: Paid vs Pending */}
        <div className="chart-card glass">
          <div className="chart-header">
            <div className="flex gap-2">
              <ArrowUpCircle size={20} className="text-blue" />
              <ArrowDownCircle size={20} className="text-red" />
            </div>
            <h3>Contas Pagas vs Pendentes</h3>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none' }}
                  />
                  <Legend />
                  <Bar dataKey="pago" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Pagas" />
                  <Bar dataKey="pendente" fill="#f87171" radius={[4, 4, 0, 0]} name="Pendentes" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Most Sold Products */}
        <div className="chart-card glass">
          <div className="chart-header">
            <PackageCheck size={20} className="text-yellow" />
            <h3>Top 5 Itens Mais Vendidos</h3>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productRanking.mostSold} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="quantity" fill="#fbbf24" radius={[0, 4, 4, 0]} name="Qtd" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Least Sold Products */}
        <div className="chart-card glass">
          <div className="chart-header">
            <Filter size={20} className="text-purple" />
            <h3>Itens Menos Vendidos</h3>
          </div>
          <div className="chart-container">
            {loading ? (
              <div className="loading-placeholder">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productRanking.leastSold}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="quantity"
                    nameKey="name"
                  >
                    {productRanking.leastSold.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
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
        }

        .chart-header { display: flex; align-items: center; gap: 12px; }
        .chart-header h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }

        .text-green { color: #4ade80; }
        .text-blue { color: #60a5fa; }
        .text-red { color: #f87171; }
        .text-yellow { color: #fbbf24; }
        .text-purple { color: #a78bfa; }

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
