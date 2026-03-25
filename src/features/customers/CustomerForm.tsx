import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

interface CustomerFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('customers')
      .insert([{ name, phone }]);

    if (!error) {
      onSuccess();
      onClose();
    } else {
      alert('Erro ao salvar cliente: ' + error.message);
    }
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
          {saving ? 'Salvando...' : 'Salvar Cliente'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
