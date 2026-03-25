import React, { useState, useRef } from 'react';
import { Settings, Save, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { supabase } from '../../config/supabase';

const SystemSettingsView: React.FC = () => {
  const { settings, updateSettings, loading } = useSystemSettings();
  
  const [systemName, setSystemName] = useState(settings?.system_name || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (settings) {
      setSystemName(settings.system_name);
      setLogoUrl(settings.logo_url || '');
    }
  }, [settings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (max 2MB)
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to 'system-assets' bucket
      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Erro no upload: ' + (err.message || 'Verifique se o bucket "system-assets" foi criado no Supabase.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(systemName, logoUrl || null);
      alert('Configurações atualizadas com sucesso em tempo real!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Carregando configurações...</div>;
  }

  return (
    <div className="view fade-in">
      <div className="view-header">
        <div className="header-info">
          <h2>Configurações do Sistema</h2>
          <p className="subtitle">Altere o nome e o logo que aparecem para todos os funcionários.</p>
        </div>
        <Settings size={28} color="var(--primary)" />
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '24px 0', padding: '24px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700', color: '#334155' }}>
              Nome do Sistema (Empresa)
            </label>
            <input 
              required 
              type="text" 
              value={systemName} 
              onChange={(e) => setSystemName(e.target.value)} 
              placeholder="Ex: A&R Alimentos" 
              style={{ fontSize: '1.1rem', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'block' }}>
              Logotipo do Sistema
            </label>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '20px', 
                  background: '#f8fafc', 
                  border: '2px dashed #cbd5e1', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {isUploading ? (
                  <Loader2 className="animate-spin text-primary" size={32} />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={32} color="#94a3b8" />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSaving}
                  style={{ padding: '8px 16px', fontSize: '0.9rem', gap: '8px' }}
                >
                  <Upload size={18} />
                  {logoUrl ? 'Alterar Logo' : 'Fazer Upload'}
                </button>
                {logoUrl && (
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={handleRemoveLogo}
                    style={{ padding: '8px 16px', fontSize: '0.9rem', gap: '8px', color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    <Trash2 size={18} />
                    Remover
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '12px' }}>
              Recomendado: Imagem PNG ou JPG quadrada, até 2MB.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSaving || isUploading}
            style={{ marginTop: '12px', padding: '16px', fontSize: '1.1rem', justifyContent: 'center', borderRadius: '12px' }}
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            {isSaving ? 'Salvando e Propagando...' : 'Salvar Configurações'}
          </button>
        </form>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .btn-outline {
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-outline:hover { background: #fee2e2; }
      `}</style>
    </div>
  );
};

export default SystemSettingsView;
