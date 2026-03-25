import React from 'react';

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedId, onSelect }) => {
  return (
    <div className="category-scroll">
      <button 
        className={`cat-tab ${selectedId === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
      >
        Todos
      </button>
      {categories.map(cat => (
        <button 
          key={cat.id} 
          className={`cat-tab ${selectedId === cat.id ? 'active' : ''}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </button>
      ))}

      <style>{`
        .category-scroll { 
          display: flex; 
          gap: 10px; 
          overflow-x: auto; 
          padding: 10px 4px; 
          margin-bottom: 20px;
          scrollbar-width: none;
        }
        .category-scroll::-webkit-scrollbar { display: none; }
        
        .cat-tab {
          white-space: nowrap;
          padding: 10px 20px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 25px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-muted);
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }
        .cat-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default CategoryFilter;
