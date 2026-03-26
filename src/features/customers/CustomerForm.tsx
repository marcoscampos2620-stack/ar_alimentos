import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSuccess }) => {
  const isEditing = !!customer;
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (isEditing) {
      const { error } = await supabase
        .from('customers')
        .update({ name, phone })
        .eq('id', customer!.id);

      if (error) {
        alert('Erro ao atualizar cliente: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('customers')
        .insert([{ name, phone }]);

      if (error) {
        alert('Erro ao salvar cliente: ' + error.message);
        setSaving(false);
        return;
      }
    }

    onSuccess();
    onClose();
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nome do Cliente</label>
        <input 
          required 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Telefone / WhatsApp</label>
        <input 
          type="text" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </div>
      <div className="form-actions">
        <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Cliente')}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
