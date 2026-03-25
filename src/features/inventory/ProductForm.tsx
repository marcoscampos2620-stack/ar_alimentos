import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Plus, Check, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
  category_id?: string;
  image_url?: string;
}

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSuccess }) => {
  const [name, setName] = useState(product?.name || '');
  const [unitType, setUnitType] = useState(product?.unit_type || 'UN');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [stock, setStock] = useState(product?.stock_quantity.toString() || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || '');
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (selectId?: string) => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) {
      setCategories(data);
      if (selectId) setCategoryId(selectId);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchCategories(data.id);
      setShowNewCategoryForm(false);
      setNewCategoryName('');
    } catch (error: any) {
      alert('Erro ao criar categoria: ' + error.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const productData = { 
      name, 
      unit_type: unitType, 
      price: parseFloat(price), 
      stock_quantity: parseFloat(stock),
      category_id: categoryId || null,
      image_url: imageUrl || null
    };

    let error;
    if (product) {
      const { error: err } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('products')
        .insert([productData]);
      error = err;
    }

    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Erro ao salvar produto: ' + error.message);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nome do Produto</label>
        <input 
          required 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Inhame, Cará"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Categoria</label>
        <div className="category-select-wrapper">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem Categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            className="btn-add-category" 
            onClick={() => setShowNewCategoryForm(true)}
            title="Nova Categoria"
          >
            <Plus size={20} />
          </button>
        </div>

        {showNewCategoryForm && (
          <div className="inline-category-form animate-fade-in">
            <input 
              autoFocus
              type="text" 
              placeholder="Nome da nova categoria" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCategory();
                }
                if (e.key === 'Escape') setShowNewCategoryForm(false);
              }}
            />
            <button 
              type="button" 
              className="btn-save-cat" 
              onClick={handleCreateCategory}
              disabled={creatingCategory}
            >
              <Check size={18} />
            </button>
            <button 
              type="button" 
              className="btn-cancel-cat" 
              onClick={() => setShowNewCategoryForm(false)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Unidade</label>
          <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
            <option value="UN">Unidade (UN)</option>
            <option value="KG">Quilo (KG)</option>
            <option value="CX">Caixa (CX)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Preço (R$)</label>
          <input 
            required 
            type="number" 
            step="0.01" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Estoque Inicial</label>
          <input 
            required 
            type="number" 
            step="0.001" 
            value={stock} 
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">URL da Imagem (Opcional)</label>
          <input 
            type="text" 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
          />
        </div>
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>

      <style>{`
        .category-select-wrapper { display: flex; gap: 8px; }
        .category-select-wrapper select { flex: 1; }
        .btn-add-category {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-add-category:hover { background: var(--primary); color: white; border-color: var(--primary); }

        .inline-category-form {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          padding: 8px;
          background: #f8fafc;
          border-radius: var(--radius-sm);
          border: 1px dashed var(--border);
        }
        .inline-category-form input {
          flex: 1;
          padding: 6px 10px;
          font-size: 0.85rem;
          border: 1px solid var(--border);
          border-radius: 4px;
        }
        .btn-save-cat, .btn-cancel-cat {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-save-cat { background: var(--success); color: white; }
        .btn-cancel-cat { background: #e2e8f0; color: var(--text-muted); }
        .btn-save-cat:disabled { opacity: 0.5; }
        
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </form>
  );
};

export default ProductForm;
