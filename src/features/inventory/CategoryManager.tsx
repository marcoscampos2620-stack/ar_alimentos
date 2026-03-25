import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Trash2, Plus, Tag, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: string;
  name: string;
}

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newName.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('categories').insert([{ name: newName }]);
    if (!error) {
      setNewName('');
      fetchCategories();
    } else {
      alert('Erro ao criar categoria: ' + error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza? Isso pode afetar produtos vinculados.')) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      fetchCategories();
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

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
      <form onSubmit={handleCreate} className="category-form glass shadow-sm">
        <Tag size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="Nova categoria (ex: Frios, Frutas...)" 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          <Plus size={18} />
          <span>{loading ? '...' : 'Adicionar'}</span>
        </button>
      </form>

      <div className="category-list">
        {categories.map(cat => (
          <div key={cat.id} className="category-item card shadow-sm">
            <span>{cat.name}</span>
            <button onClick={() => handleDelete(cat.id)} className="btn-icon text-error">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="empty-text">Nenhuma categoria cadastrada.</p>}
      </div>

      <style>{`
        .category-manager { display: flex; flex-direction: column; gap: 20px; max-width: 600px; margin: 0 auto; }
        .category-form { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-radius: 12px; background: white; border: 1px solid var(--border); }
        .category-form input { flex: 1; border: none; outline: none; font-size: 0.95rem; }
        .category-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .category-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border-radius: 10px; font-weight: 600; color: var(--text-main); }
        .empty-text { text-align: center; color: var(--text-muted); padding: 20px; }
      `}</style>
    </div>
  );
};

export default CategoryManager;
