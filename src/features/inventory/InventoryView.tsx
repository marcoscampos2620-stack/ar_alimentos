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
  Tag,
  Pencil,
  Trash2,
  Play,
  Pause,
  X
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
  is_paused?: boolean;
  image_url?: string;
  categories?: { name: string };
}

const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'movements'>('inventory');
  const [activeMovementProduct, setActiveMovementProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [pausingProductId, setPausingProductId] = useState<string | null>(null);

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

  const togglePauseProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_paused: !product.is_paused })
        .eq('id', product.id);

      if (error) throw error;
      setPausingProductId(null);
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao alterar status: ' + error.message);
    }
  };

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

      <div className="tabs-container-modern">
        <div className="segmented-control">
          <button 
            className={`segment-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Box size={18} />
            <span>Estoque Atual</span>
          </button>
          <button 
            className={`segment-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <Tag size={18} />
            <span>Categorias</span>
          </button>
          <button 
            className={`segment-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <History size={18} />
            <span>Movimentação</span>
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
          <div className="inventory-filters-modern">
            <div className="search-pill-v2 shadow-sm">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar no estoque..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X size={16} className="clear-search" onClick={() => setSearchTerm('')} />}
            </div>

            <div className="category-capsules">
              <button 
                className={`capsule-btn ${selectedCategoryId === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryId('all')}
              >
                Tudo
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`capsule-btn ${selectedCategoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading">Carregando estoque...</div>
          ) : (
            <div className="product-grid-modern">
              {filteredProducts.map(product => {
                const isLowStock = product.stock_quantity <= 5;
                const isOutOfStock = product.stock_quantity <= 0;
                const hasImage = !!(product as any).image_url;

                return (
                  <div key={product.id} className={`card-modern product-item-v2 ${isOutOfStock ? 'out' : ''} ${product.is_paused ? 'paused' : ''}`}>
                    <div className="product-image-container">
                      {hasImage ? (
                        <img src={(product as any).image_url} alt={product.name} className="product-img-v2" />
                      ) : (
                        <div className="product-img-placeholder">
                          <Package size={32} />
                        </div>
                      )}
                      <div className={`stock-badge-v2 ${isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success'}`}>
                        {product.stock_quantity.toFixed(product.unit_type === 'KG' ? 3 : 0)}
                      </div>
                    </div>

                    <div className="product-content-v2">
                      <div className="product-header-v2">
                        <span className="product-name-v2">{product.name}</span>
                        <span className="product-unit-v2">{product.unit_type}</span>
                      </div>
                      
                      <div className="product-price-v2">
                        R$ {product.price.toFixed(2)}
                      </div>

                      {product.categories?.name && (
                        <div className="product-category-v2">{product.categories.name}</div>
                      )}

                      <div className="product-actions-v2">
                        {isAdmin && (
                          <div className="admin-actions-v2">
                            {deletingProductId === product.id ? (
                              <div className="delete-confirm-compact animate-fade-in">
                                <button className="btn-confirm-v2 yes" onClick={() => handleDeleteProduct(product.id)}>Sim</button>
                                <button className="btn-confirm-v2 no" onClick={() => setDeletingProductId(null)}>Não</button>
                              </div>
                            ) : pausingProductId === product.id ? (
                              <div className="delete-confirm-compact animate-fade-in">
                                <button className="btn-confirm-v2 yes" onClick={() => togglePauseProduct(product)}>Sim</button>
                                <button className="btn-confirm-v2 no" onClick={() => setPausingProductId(null)}>Não</button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  className={`action-btn-v2 pause ${product.is_paused ? 'active' : ''}`} 
                                  onClick={() => setPausingProductId(product.id)}
                                  title={product.is_paused ? "Ativar Item" : "Pausar Item"}
                                >
                                  {product.is_paused ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                                <button className="action-btn-v2 edit" onClick={() => { setEditingProduct(product); setShowForm(true); }}>
                                  <Pencil size={16} />
                                </button>
                                <button className="action-btn-v2 delete" onClick={() => setDeletingProductId(product.id)}>
                                  <Trash2 size={16} />
                                </button>
                                <button 
                                  className={`action-btn-v2 move ${activeMovementProduct?.id === product.id ? 'active' : ''}`}
                                  onClick={() => setActiveMovementProduct(product)}
                                  title="Movimentar Estoque"
                                >
                                  <ArrowUpRight size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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
      ) : activeTab === 'categories' ? (
        <CategoryManager />
      ) : (
        <MovementsList />
      )}

      {activeMovementProduct && (
        <div className="modal-overlay-v2 animate-fade-in" onClick={() => setActiveMovementProduct(null)}>
          <div className="modal-container-v2 bottom-sheet" onClick={e => e.stopPropagation()}>
            <StockMovementForm 
              product={activeMovementProduct}
              onClose={() => setActiveMovementProduct(null)}
              onSuccess={fetchProducts}
            />
          </div>
        </div>
      )}

      <style>{`
        .view { padding: 20px; max-width: 1400px; margin: 0 auto; }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header-info h2 { font-size: 2rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; }
        .header-info p { color: var(--text-muted); font-weight: 600; }

        .tabs-container-modern { margin-bottom: 32px; display: flex; justify-content: center; }
        .segmented-control {
          display: flex;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 16px;
          gap: 4px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        .segment-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-muted);
          transition: 0.3s;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .segment-btn.active {
          background: white;
          color: var(--primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        .segment-btn:hover:not(.active) { color: var(--text-main); background: rgba(255,255,255,0.5); }

        .inventory-filters-modern { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
        .search-pill-v2 {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 12px 20px;
          border-radius: 50px;
          border: 1px solid var(--border);
          transition: 0.3s;
        }
        .search-pill-v2:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .search-pill-v2 input { border: none; outline: none; flex: 1; font-weight: 600; font-size: 0.95rem; }
        .clear-search { color: var(--text-muted); cursor: pointer; }

        .category-capsules {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 4px 0;
          scrollbar-width: none;
        }
        .category-capsules::-webkit-scrollbar { display: none; }
        
        .capsule-btn {
          white-space: nowrap;
          padding: 8px 24px;
          background: white;
          border: 1.5px solid var(--border);
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-muted);
          transition: 0.3s;
          cursor: pointer;
        }
        .capsule-btn:hover { border-color: var(--primary); color: var(--primary); }
        .capsule-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

        .product-grid-modern {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
        }

        .product-item-v2 {
          background: white;
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .product-item-v2.paused { opacity: 0.6; grayscale: 1; filter: grayscale(0.8); }
        .product-item-v2:hover { transform: translateY(-8px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border-color: var(--primary); }

        .action-btn-v2.pause.active { color: #10b981; border-color: #10b981; }
        .action-btn-v2.pause:hover { color: #f59e0b; border-color: #f59e0b; }

        .product-image-container {
          height: 140px;
          background: #f8fafc;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--border);
        }
        .product-img-v2 { width: 100%; height: 100%; object-fit: cover; }
        .product-img-placeholder { color: #cbd5e1; }
        
        .stock-badge-v2 {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 900;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 2;
        }
        .stock-badge-v2.success { background: #10b981; color: white; }
        .stock-badge-v2.warning { background: #f59e0b; color: white; }
        .stock-badge-v2.danger { background: #ef4444; color: white; }

        .product-content-v2 { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .product-header-v2 { display: flex; justify-content: space-between; align-items: center; }
        .product-name-v2 { font-weight: 800; color: var(--text-main); font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .product-unit-v2 { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        
        .product-price-v2 { font-size: 1.25rem; font-weight: 900; color: var(--primary); }
        .product-category-v2 { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); opacity: 0.8; }

        .admin-actions-v2 { display: flex; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9; }
        .action-btn-v2 {
          flex: 1;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          transition: 0.2s;
          cursor: pointer;
        }
        .action-btn-v2:hover { background: #f8fafc; color: var(--primary); border-color: var(--primary); }
        .action-btn-v2.delete:hover { color: #ef4444; border-color: #ef4444; }
        .action-btn-v2.move.active { background: var(--primary); color: white; border-color: var(--primary); }

        /* Modal & Bottom Sheet Modern */
        .modal-overlay-v2 {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container-v2 {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: modalAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 600px) {
          .modal-overlay-v2 { padding: 0; align-items: flex-end; }
          .modal-container-v2.bottom-sheet {
            max-width: none;
            border-radius: 24px 24px 0 0;
            animation: bottomSheetAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        @keyframes bottomSheetAppear {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .delete-confirm-compact { display: flex; gap: 4px; width: 100%; }
        .btn-confirm-v2 { flex: 1; height: 36px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.75rem; cursor: pointer; }
        .btn-confirm-v2.yes { background: #ef4444; color: white; }
        .btn-confirm-v2.no { background: #f1f5f9; color: var(--text-muted); }

        .empty-state-v2 {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px;
          color: var(--text-muted);
          background: white;
          border-radius: var(--radius-md);
          border: 2px dashed var(--border);
        }

        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1200px) { .product-grid-modern { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 900px) { .product-grid-modern { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 600px) {
          .product-grid-modern { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .product-content-v2 { padding: 12px; gap: 6px; }
          .product-name-v2 { font-size: 0.9rem; }
          .product-price-v2 { font-size: 1.1rem; }
          .product-image-container { height: 120px; }
          .view-header { flex-direction: column; align-items: stretch; gap: 16px; }
          .admin-actions-v2 { gap: 6px; }
          .action-btn-v2 { height: 40px; }
          .segment-btn span { display: none; }
          .segment-btn { padding: 10px; }
        }
      `}</style>
    </div>
  );
};

export default InventoryView;
