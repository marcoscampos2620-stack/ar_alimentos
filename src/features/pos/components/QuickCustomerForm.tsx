import React, { useState } from 'react';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, User, Phone, MapPin, Loader2, CheckCircle2 } from 'lucide-react';

interface QuickCustomerFormProps {
  onClose: () => void;
  onCustomerCreated: (customerId: string, customerName: string) => void;
}

const applyPhoneMask = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const extractDigits = (masked: string): string => masked.replace(/\D/g, '');

const QuickCustomerRegistration: React.FC<QuickCustomerFormProps> = ({ onClose, onCustomerCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = extractDigits(phone);
  const isPhoneValid = phoneDigits.length === 11 && phoneDigits[2] === '9';

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(applyPhoneMask(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!isPhoneValid) return setError('Telefone inválido. Use DDD + 9 + 8 dígitos.');

    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert([{
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          created_by: user?.id || null,
        }])
        .select('id, name')
        .single();

      if (insertError) throw insertError;
      if (data) onCustomerCreated(data.id, data.name);
    } catch (err: any) {
      setError('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="native-view-full fade-in">
      <div className="native-header">
        <button className="btn-native-back" onClick={onClose}>
          <ArrowLeft size={24} />
        </button>
        <div className="header-text">
          <h3>Novo Cadastro</h3>
          <p>Identifique um novo cliente no sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="native-form">
        {error && <div className="native-error-msg">{error}</div>}

        <div className="form-section shadow-sm">
          <div className="native-field">
            <label><User size={16} /> Nome Completo <span className="req">*</span></label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="native-field">
            <label><Phone size={16} /> WhatsApp / Celular <span className="req">*</span></label>
            <input
              type="tel"
              placeholder="(00) 90000-0000"
              value={phone}
              onChange={handlePhoneChange}
              required
              inputMode="numeric"
            />
            <div className={`native-hint ${isPhoneValid ? 'valid' : ''}`}>
              {isPhoneValid ? <><CheckCircle2 size={14} /> Telefone validado</> : 'DDD + 9 + número'}
            </div>
          </div>

          <div className="native-field">
            <label><MapPin size={16} /> Endereço Completo <span className="opt">(Opcional)</span></label>
            <textarea
              placeholder="Rua, Número, Bairro, Cidade..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn-native-primary" disabled={saving || !name.trim() || !isPhoneValid}>
            {saving ? <Loader2 size={20} className="animate-spin" /> : 'Salvar e Abrir Pedido'}
          </button>
        </div>
      </form>

      <style>{`
        .native-view-full {
          min-height: calc(100vh - 120px);
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .native-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: white;
          border-bottom: 1px solid var(--border);
        }
        .btn-native-back {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }
        .header-text h3 {
          font-weight: 800;
          font-size: 1.3rem;
          color: var(--text-main);
          margin-bottom: 2px;
        }
        .header-text p {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .native-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 24px;
        }
        .form-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border: 1px solid var(--border);
        }
        .native-field { display: flex; flex-direction: column; gap: 8px; }
        .native-field label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .native-field label .req { color: #ef4444; }
        .native-field label .opt { color: #94a3b8; font-weight: 500; }
        
        .native-field input, .native-field textarea {
          padding: 16px;
          border: 2px solid #f1f5f9;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
          background: #f8fafc;
          outline: none;
        }
        .native-field input:focus, .native-field textarea:focus {
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }
        .native-hint { font-size: 0.75rem; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 4px; padding-left: 4px; }
        .native-hint.valid { color: #16a34a; }
        
        .native-error-msg {
          background: #fef2f2;
          color: #b91c1c;
          padding: 16px;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 700;
          border: 1px solid #fee2e2;
        }
        .form-footer { margin-top: auto; }
        .btn-native-primary {
          width: 100%;
          padding: 18px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        }
        .btn-native-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default QuickCustomerRegistration;
