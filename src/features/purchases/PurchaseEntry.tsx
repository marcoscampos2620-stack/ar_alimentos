import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

interface PurchaseEntryProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseEntry: React.FC<PurchaseEntryProps> = ({ onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name');
    if (data) setSuppliers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert('Selecione um fornecedor');
    setSaving(true);

    const { error } = await supabase
      .from('purchases')
      .insert([{ 
        supplier_id: supplierId, 
        total_amount: parseFloat(amount), 
        due_date: dueDate,
        status: 'PENDING'
      }]);

    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Erro ao salvar compra: ' + error.message);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Fornecedor</label>
        <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Selecione...</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Valor Total (R$)</label>
          <input 
            required 
            type="number" 
            step="0.01" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Data de Vencimento</label>
          <input 
            required 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Registrando...' : 'Salvar Compra'}
        </button>
      </div>
    </form>
  );
};

export default PurchaseEntry;
