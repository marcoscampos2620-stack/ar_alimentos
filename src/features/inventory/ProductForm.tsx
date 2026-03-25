import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabase';
import { Plus, Check, X, Upload, Image as ImageIcon } from 'lucide-react';

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
  is_paused?: boolean;
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
  const [isPaused, setIsPaused] = useState(product?.is_paused || false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStockVal = parseFloat(stock);
    const oldStockVal = product?.stock_quantity || 0;

    const productData = { 
      name, 
      unit_type: unitType, 
      price: parseFloat(price), 
      stock_quantity: newStockVal,
      category_id: categoryId || null,
      image_url: imageUrl || null,
      is_paused: isPaused
    };

    let error;
    if (product) {
      const { error: err } = await supabase
        .from('products')
        .update(productData)
        .eq('id', product.id);
      error = err;

      // Log movement if stock changed
      if (!error && newStockVal !== oldStockVal) {
        await supabase.from('stock_movements').insert([{
          product_id: product.id,
          quantity: newStockVal - oldStockVal,
          type: newStockVal > oldStockVal ? 'in' : 'out',
          reason: 'Edição de Configurações'
        }]);
      }
    } else {
      const { data, error: err } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      error = err;

      // Log initial movement
      if (!error && data) {
        await supabase.from('stock_movements').insert([{
          product_id: data.id,
          quantity: newStockVal,
          type: 'in',
          reason: 'Cadastro Inicial'
        }]);
      }
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
          <label className="form-label">Imagem do Produto (Opcional)</label>
          <div className="image-upload-wrapper">
            {imageUrl ? (
              <div className="image-preview-v2">
                <img src={imageUrl} alt="Preview" />
                <button type="button" className="btn-remove-img" onClick={() => setImageUrl('')}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="btn-upload-v2" 
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>Upload Foto</span>
                  </>
                )}
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden-input" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Link Externo da Imagem (Alternativo)</label>
        <div className="input-with-icon">
          <ImageIcon size={18} className="input-icon" />
          <input 
            type="text" 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
          />
        </div>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-container">
          <input 
            type="checkbox" 
            checked={!isPaused} 
            onChange={(e) => setIsPaused(!e.target.checked)} 
          />
          <span className="checkmark"></span>
          <span className="checkbox-label">Item Ativo (Mostrar no PDV)</span>
        </label>
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

        .hidden-input { display: none; }
        .image-upload-wrapper { display: flex; gap: 12px; align-items: center; }
        .btn-upload-v2 {
          flex: 1;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          color: #64748b;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-upload-v2:hover { background: #f1f5f9; border-color: var(--primary); color: var(--primary); }
        
        .image-preview-v2 {
          width: 80px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          border: 1px solid var(--border);
        }
        .image-preview-v2 img { width: 100%; height: 100%; object-fit: cover; }
        .btn-remove-img {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px;
          cursor: pointer;
        }

        .input-with-icon { position: relative; }
        .input-with-icon .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .input-with-icon input { padding-left: 40px; }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(0,0,0,0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .checkbox-group { margin-top: 10px; }
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-weight: 700;
          color: var(--text-main);
          user-select: none;
        }
        .checkbox-container input { display: none; }
        .checkmark {
          width: 24px;
          height: 24px;
          background: #f1f5f9;
          border: 2px solid var(--border);
          border-radius: 6px;
          position: relative;
          transition: 0.2s;
        }
        .checkbox-container input:checked ~ .checkmark {
          background: var(--primary);
          border-color: var(--primary);
        }
        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 7px;
          top: 3px;
          width: 6px;
          height: 12px;
          border: solid white;
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .checkbox-container input:checked ~ .checkmark:after {
          display: block;
        }
        .checkbox-label { font-size: 0.95rem; }
      `}</style>
    </form>
  );
};

export default ProductForm;
