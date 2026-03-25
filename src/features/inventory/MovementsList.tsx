import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Movement {
  id: string;
  product_id: string;
  products: { name: string; unit_type: string } | null;
  quantity: number;
  type: string;
  reason: string;
  created_at: string;
}

const MovementsList: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (name, unit_type)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setMovements(data as any);
    setLoading(false);
  };

  const handleDeleteMovement = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta movimentação do histórico?')) return;

    try {
      const { error } = await supabase.from('stock_movements').delete().eq('id', id);
      if (error) throw error;
      fetchMovements();
    } catch (error: any) {
      alert('Erro ao excluir movimentação: ' + error.message);
    }
  };

  if (loading) return <div className="loading">Carregando histórico...</div>;

  return (
    <div className="movements-container fade-in">
      <div className="section-header-mini">
        <h3>Últimas Movimentações</h3>
        <button className="btn-icon" onClick={fetchMovements}><RefreshCcw size={16} /></button>
      </div>

      <div className="movements-list">
        {movements.map(m => (
          <div key={m.id} className="movement-card">
            <div className={`movement-icon ${m.quantity > 0 ? 'in' : 'out'}`}>
              {m.quantity > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
            
            <div className="movement-info">
              <span className="product-name">{m.products?.name || 'Produto Removido'}</span>
              <span className="movement-details">
                {m.reason} • {new Intl.DateTimeFormat('pt-BR', { 
                  day: '2-digit', 
                  month: 'short', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }).format(new Date(m.created_at))}
              </span>
            </div>

            <div className={`movement-value ${m.quantity > 0 ? 'positive' : 'negative'}`}>
              {m.quantity > 0 ? '+' : ''}{m.quantity.toFixed(m.products?.unit_type === 'KG' ? 3 : 0)}
              <span className="unit">{m.products?.unit_type}</span>
            </div>

            {isAdmin && (
              <button 
                className="btn-delete-mini"
                onClick={() => handleDeleteMovement(m.id)}
                title="Excluir do Histórico"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        {movements.length === 0 && (
          <div className="empty-state">
            <p>Nenhuma movimentação registrada</p>
          </div>
        )}
      </div>

      <style>{`
        .movements-container { display: flex; flex-direction: column; gap: 16px; }
        .section-header-mini { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .section-header-mini h3 { font-size: 1.1rem; color: var(--text-main); font-weight: 700; }
        
        .movements-list { display: flex; flex-direction: column; gap: 12px; }
        
        .movement-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s;
        }

        .movement-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .movement-icon.in { background: #f0fdf4; color: var(--success); }
        .movement-icon.out { background: #fef2f2; color: var(--error); }

        .movement-info { display: flex; flex-direction: column; flex: 1; }
        .movement-info .product-name { font-weight: 700; color: var(--text-main); font-size: 0.95rem; }
        .movement-info .movement-details { font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; }

        .movement-value { font-weight: 800; font-size: 1.1rem; text-align: right; display: flex; align-items: baseline; gap: 4px; }
        .movement-value.positive { color: var(--success); }
        .movement-value.negative { color: var(--error); }
        .movement-value .unit { font-size: 0.7rem; opacity: 0.7; font-weight: 600; }

        .btn-delete-mini {
          opacity: 0;
          padding: 6px;
          color: var(--text-muted);
          transition: all 0.2s;
          border-radius: 4px;
        }
        .movement-card:hover .btn-delete-mini { opacity: 0.6; }
        .btn-delete-mini:hover { opacity: 1 !important; color: var(--error); background: #fef2f2; }

        @media (max-width: 768px) {
          .movement-card { padding: 10px; gap: 12px; }
          .movement-icon { width: 32px; height: 32px; }
          .movement-value { font-size: 0.95rem; }
        }
      `}</style>
    </div>
  );
};

export default MovementsList;
