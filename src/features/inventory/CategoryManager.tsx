import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Trash2, Plus, Tag, Lock, Search, Check, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id?: string | null;
}

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, category_id').order('name');
    if (data) setProducts(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newName.trim()) return;
    setLoading(true);

    try {
      // 1. Criar a categoria
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert([{ name: newName }])
        .select()
        .single();

      if (catError) throw catError;

      // 2. Associar produtos em massa se houver seleção
      if (selectedProductIds.length > 0) {
        const { error: prodError } = await supabase
          .from('products')
          .update({ category_id: newCat.id })
          .in('id', selectedProductIds);

        if (prodError) throw prodError;
      }

      setNewName('');
      setSelectedProductIds([]);
      setIsExpanded(false);
      fetchCategories();
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao criar categoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setNewName(cat.name);
    // Filtrar produtos que já pertencem a esta categoria
    const currentProdIds = products
      .filter(p => p.category_id === cat.id)
      .map(p => p.id);
    setSelectedProductIds(currentProdIds);
    setIsExpanded(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingCategory || !newName.trim()) return;
    setLoading(true);

    try {
      // 1. Atualizar nome da categoria
      const { error: catError } = await supabase
        .from('categories')
        .update({ name: newName })
        .eq('id', editingCategory.id);

      if (catError) throw catError;

      // 2. Resetar associações antigas (remover categoria de produtos que não estão mais selecionados)
      const oldProdIds = products
        .filter(p => p.category_id === editingCategory.id)
        .map(p => p.id);
      
      const toRemove = oldProdIds.filter(id => !selectedProductIds.includes(id));
      if (toRemove.length > 0) {
        await supabase
          .from('products')
          .update({ category_id: null })
          .in('id', toRemove);
      }

      // 3. Adicionar novas associações
      if (selectedProductIds.length > 0) {
        const { error: prodError } = await supabase
          .from('products')
          .update({ category_id: editingCategory.id })
          .in('id', selectedProductIds);

        if (prodError) throw prodError;
      }

      handleCancelEdit();
      fetchCategories();
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao atualizar categoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewName('');
    setSelectedProductIds([]);
    setIsExpanded(false);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza? Isso pode afetar produtos vinculados.')) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      fetchCategories();
      fetchProducts(); // Refresh products too since category_id might have been set to null via cascade/trigger (though usually explicit needed)
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="category-manager empty-state-v2">
        <Lock size={48} />
        <h3>Acesso Restrito</h3>
        <p>Apenas administradores podem gerenciar categorias.</p>
      </div>
    );
  }

  return (
    <div className="category-manager fade-in">
      <form onSubmit={editingCategory ? handleUpdate : handleCreate} className="category-form-v2 glass shadow-sm">
        <div className="main-input-group">
          <Tag size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder={editingCategory ? "Editar nome..." : "Nova categoria (ex: Frios, Frutas...)"} 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="form-actions-inline">
            <button 
              type="button" 
              className={`btn-expand ${isExpanded ? 'active' : ''}`}
              onClick={() => setIsExpanded(!isExpanded)}
              title="Selecionar Produtos"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span>{selectedProductIds.length} selecionados</span>
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '...' : editingCategory ? <Check size={18} /> : <Plus size={18} />}
              <span>{loading ? '...' : editingCategory ? 'Salvar' : 'Adicionar'}</span>
            </button>
            {editingCategory && (
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="product-selector-box animate-scale-up">
            <div className="selector-header">
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder="Pesquisar produtos para associar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="product-selection-list">
              {filteredProducts.map(prod => (
                <label key={prod.id} className={`product-select-item ${selectedProductIds.includes(prod.id) ? 'selected' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedProductIds.includes(prod.id)}
                    onChange={() => toggleProduct(prod.id)}
                  />
                  <div className="prod-select-info">
                    <span className="name">{prod.name}</span>
                    {prod.category_id && !selectedProductIds.includes(prod.id) && (
                      <span className="current-cat">(Já possui categoria)</span>
                    )}
                  </div>
                  <div className="checkbox-ui">
                    {selectedProductIds.includes(prod.id) ? <Check size={14} /> : <div className="dot" />}
                  </div>
                </label>
              ))}
              {filteredProducts.length === 0 && <p className="empty-text">Nenhum produto encontrado.</p>}
            </div>
          </div>
        )}
      </form>

      <div className="category-list">
        {categories.map(cat => (
          <div key={cat.id} className="category-item-v2 card shadow-sm">
            <div className="cat-info">
              <span className="cat-name">{cat.name}</span>
              <span className="prod-count">
                {products.filter(p => p.category_id === cat.id).length} produtos
              </span>
            </div>
            <div className="cat-actions">
              <button onClick={() => handleEdit(cat)} className="btn-icon text-primary" title="Editar / Associar Produtos">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDelete(cat.id)} className="btn-icon text-error" title="Excluir Categoria">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="empty-text">Nenhuma categoria cadastrada.</p>}
      </div>

      <style>{`
        .category-manager { display: flex; flex-direction: column; gap: 24px; max-width: 800px; margin: 0 auto; }
        
        .category-form-v2 { 
          display: flex; 
          flex-direction: column; 
          background: white; 
          border-radius: 20px; 
          border: 1px solid var(--border);
          overflow: hidden;
          transition: 0.3s;
        }

        .main-input-group {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid transparent;
        }
        .main-input-group input { flex: 1; border: none; outline: none; font-size: 1rem; font-weight: 600; }

        .form-actions-inline { display: flex; gap: 8px; }

        .btn-expand {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-muted);
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-expand.active { background: var(--primary); color: white; border-color: var(--primary); }
        .btn-expand:hover:not(.active) { background: #e2e8f0; }

        .product-selector-box {
          background: #f8fafc;
          border-top: 1px solid var(--border);
          max-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .selector-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: white;
          border-bottom: 1px solid var(--border);
        }
        .selector-header input { flex: 1; border: none; outline: none; font-size: 0.9rem; background: transparent; }

        .product-selection-list {
          flex: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
          padding: 16px;
        }

        .product-select-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s;
        }
        .product-select-item:hover { border-color: var(--primary); background: #f0f7ff; }
        .product-select-item.selected { border-color: var(--primary); background: #f0f7ff; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1); }
        .product-select-item input { display: none; }

        .prod-select-info { display: flex; flex-direction: column; }
        .prod-select-info .name { font-size: 0.9rem; font-weight: 700; color: var(--text-main); }
        .prod-select-info .current-cat { font-size: 0.7rem; color: var(--text-muted); font-weight: 500; }

        .checkbox-ui {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: 0.2s;
        }
        .selected .checkbox-ui { background: var(--primary); border-color: var(--primary); }
        .checkbox-ui .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); transition: 0.2s; }
        .product-select-item:hover .dot { background: var(--primary); scale: 1.2; }

        .category-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        
        .category-item-v2 { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 16px 20px; 
          background: white; 
          border-radius: 16px; 
          border: 1px solid var(--border);
          transition: 0.3s;
        }
        .category-item-v2:hover { transform: translateY(-3px); border-color: var(--primary); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .cat-info { display: flex; flex-direction: column; gap: 2px; }
        .cat-name { font-weight: 800; color: var(--text-main); font-size: 1.05rem; }
        .prod-count { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }

        .cat-actions { display: flex; gap: 8px; }
        
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .category-form-v2 { border-radius: 12px; }
          .main-input-group { flex-direction: column; align-items: stretch; gap: 16px; }
          .form-actions-inline { justify-content: space-between; }
          .product-selection-list { grid-template-columns: 1fr; }
          .btn-expand span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default CategoryManager;
