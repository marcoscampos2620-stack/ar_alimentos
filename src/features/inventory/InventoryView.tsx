import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Plus, 
  Search, 
  Package, 
  ArrowLeft, 
  ArrowUpRight, 
  History, 
  Box,
  AlertCircle,
  Tag,
  Pencil,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProductForm from './ProductForm';
import StockMovementForm from './StockMovementForm';
import MovementsList from './MovementsList';
import CategoryManager from './CategoryManager';

interface Product {
  id: string;
  name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
  category_id?: string;
  categories?: { name: string };
}

const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'categories'>('inventory');
  const [activeMovementProductId, setActiveMovementProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name');
    
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data || []);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setDeletingProductId(null);
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao excluir produto: ' + error.message);
    }
  };

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => { setShowForm(false); setEditingProduct(null); }}>
            <ArrowLeft size={20} />
          </button>
          <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
        </div>
        <div className="form-view-content">
          <ProductForm 
            product={editingProduct || undefined}
            onClose={() => { setShowForm(false); setEditingProduct(null); }} 
            onSuccess={() => {
              fetchProducts();
              setShowForm(false);
              setEditingProduct(null);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="view fade-in">
      <div className="view-header">
        <div className="header-info">
          <h2>Controle de Estoque</h2>
          <p>Gerencie seus produtos e movimentações</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            <span>Novo Produto</span>
          </button>
        )}
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Box size={18} />
          Estoque Atual
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          Histórico
        </button>
        <button 
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={18} />
          Categorias
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          <div className="inventory-filters">
            <div className="search-bar inventory-search">
              <Search size={20} />
              <input 
                type="text" 
                placeholder="Buscar produto no estoque..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="category-filter">
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                <option value="all">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">Carregando estoque...</div>
          ) : (
            <div className="product-grid-modern">
              {filteredProducts.map(product => {
                const isLowStock = product.stock_quantity <= 5;
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                  <div key={product.id} className={`card-modern product-item ${isOutOfStock ? 'out' : ''}`}>
                    <div className="product-main">
                      <div className="product-icon">
                        <Package size={24} />
                      </div>
                      <div className="product-details">
                        <span className="product-name">{product.name}</span>
                        <div className="product-info-row">
                          <span className="product-unit">Unid: {product.unit_type}</span>
                          {product.categories?.name && (
                            <span className="product-category-badge">{product.categories.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="product-meta">
                      <div className="price-tag">
                        R$ {product.price.toFixed(2)}
                      </div>
                      <div className={`stock-badge ${isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}`}>
                        {isLowStock && <AlertCircle size={12} />}
                        {product.stock_quantity.toFixed(product.unit_type === 'KG' ? 3 : 0)} em estoque
                      </div>
                    </div>

                    <div className="product-actions">
                      {isAdmin && (
                        <div className="admin-actions">
                          {deletingProductId === product.id ? (
                            <div className="delete-confirmation-inloco animate-fade-in">
                              <span className="confirm-text">Excluir?</span>
                              <div className="confirm-buttons">
                                <button className="btn-confirm yes" onClick={() => handleDeleteProduct(product.id)}>Sim</button>
                                <button className="btn-confirm no" onClick={() => setDeletingProductId(null)}>Não</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button 
                                className="btn-icon-action edit" 
                                onClick={() => { setEditingProduct(product); setShowForm(true); }}
                                title="Editar Produto"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                className="btn-icon-action delete" 
                                onClick={() => setDeletingProductId(product.id)}
                                title="Excluir Produto"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      
                      {isAdmin && !deletingProductId && (
                        <button 
                          className={`btn-action ${activeMovementProductId === product.id ? 'active' : ''}`}
                          onClick={() => setActiveMovementProductId(activeMovementProductId === product.id ? null : product.id)}
                        >
                          <ArrowUpRight size={16} />
                          {activeMovementProductId === product.id ? 'Cancelar' : 'Movimentar'}
                        </button>
                      )}
                    </div>

                    {activeMovementProductId === product.id && (
                      <StockMovementForm 
                        product={product}
                        onClose={() => setActiveMovementProductId(null)}
                        onSuccess={fetchProducts}
                      />
                    )}
                  </div>
                );
              })}
              
              {filteredProducts.length === 0 && (
                <div className="empty-state-v2">
                  <Package size={48} />
                  <p>Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : activeTab === 'history' ? (
        <MovementsList />
      ) : (
        <CategoryManager />
      )}

      <style>{`
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-info h2 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px; }
        .header-info p { color: var(--text-muted); font-size: 0.9rem; }

        .tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .tab-btn.active {
          background: white;
          color: var(--primary);
          border-color: var(--border);
          box-shadow: var(--shadow-sm);
        }

        .inventory-filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .inventory-search { flex: 1; min-width: 250px; margin-bottom: 0; }
        
        .category-filter select { 
          height: 48px; 
          padding: 0 16px; 
          border-radius: var(--radius-sm); 
          border: 1px solid var(--border); 
          background: white; 
          font-weight: 600; 
          color: var(--text-main); 
          outline: none;
        }

        .product-info-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .product-category-badge { 
          font-size: 0.65rem; 
          font-weight: 700; 
          color: var(--primary); 
          background: #eef2ff; 
          padding: 2px 8px; 
          border-radius: 10px; 
          text-transform: uppercase;
        }

        .product-grid-modern {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 1024px) {
          .product-grid-modern { grid-template-columns: repeat(2, 1fr); }
        }

        .product-item {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .product-item.out { opacity: 0.7; border-color: var(--error); border-style: dashed; }

        .product-main { display: flex; align-items: center; gap: 12px; }
        .product-icon {
          width: 44px;
          height: 44px;
          background: var(--bg-main);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .product-details { display: flex; flex-direction: column; }
        .product-name { font-weight: 700; color: var(--text-main); font-size: 1.05rem; }
        .product-unit { font-size: 0.75rem; color: var(--text-muted); }

        .product-meta { display: flex; justify-content: space-between; align-items: center; }
        .price-tag { font-weight: 800; color: var(--primary); font-size: 1.1rem; }
        
        .stock-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stock-badge.success { background: #f0fdf4; color: var(--success); }
        .stock-badge.warning { background: #fffbeb; color: #d97706; }
        .stock-badge.danger { background: #fef2f2; color: var(--error); }

        .product-actions { border-top: 1px solid var(--border); pt: 12px; mt: 4px; }
        .btn-action {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg-main);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
          margin-top: 12px;
        }
        .btn-action.active { background: #fee2e2; color: var(--error); border-color: #fecaca; }
        .btn-action:hover { background: var(--primary); color: white; border-color: var(--primary); }
        .btn-action.active:hover { background: #fecaca; }

        .admin-actions { display: flex; gap: 8px; margin-bottom: 4px; }
        .btn-icon-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: white;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .btn-icon-action:hover { border-color: var(--primary); color: var(--primary); }
        .btn-icon-action.delete:hover { border-color: var(--error); color: var(--error); }

        .delete-confirmation-inloco {
          width: 100%;
          background: #fef2f2;
          padding: 8px;
          border-radius: var(--radius-sm);
          border: 1px solid #fee2e2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .confirm-text { font-size: 0.8rem; font-weight: 800; color: var(--error); text-transform: uppercase; }
        .confirm-buttons { display: flex; gap: 4px; }
        .btn-confirm {
          padding: 4px 12px;
          border-radius: 4px;
          border: none;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-confirm.yes { background: var(--error); color: white; }
        .btn-confirm.no { background: white; color: var(--text-muted); border: 1px solid var(--border); }
        .btn-confirm:hover { filter: brightness(1.1); }
        
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .empty-state-v2 {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px;
          color: var(--text-muted);
          background: white;
          border-radius: var(--radius-md);
          border: 2px dashed var(--border);
        }

        @media (max-width: 768px) {
          .product-grid-modern { grid-template-columns: 1fr; }
          .view-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .btn-primary { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default InventoryView;
