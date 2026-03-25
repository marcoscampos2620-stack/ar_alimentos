import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Plus, 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  UserCog, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Calendar, 
  Settings,
  Mail,
  Key,
  Fingerprint,
  ChevronRight,
  Edit3
} from 'lucide-react';
import CustomersView from '../customers/CustomersView';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  role: string;
  permissions: string[];
}

const PERMISSION_LABELS: Record<string, { label: string, icon: any }> = {
  dashboard: { label: 'Início', icon: LayoutDashboard },
  inventory: { label: 'Estoque', icon: Package },
  pos: { label: 'Vendas (PDV)', icon: ShoppingCart },
  financial: { label: 'Financeiro', icon: Calendar },
  personnel: { label: 'Equipe/Clientes', icon: UserCog },
  settings: { label: 'Configurações', icon: Settings },
};

const PersonnelView: React.FC = () => {
  const [innerTab, setInnerTab] = useState<'personnel' | 'customers'>('personnel');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('EMPLOYEE');
  const [newPerms, setNewPerms] = useState<string[]>(['dashboard', 'pos', 'inventory']);

  // Notification state
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (showForm) {
      document.body.classList.add('form-open');
    } else {
      document.body.classList.remove('form-open');
    }
    return () => document.body.classList.remove('form-open');
  }, [showForm]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
    setLoading(false);
  };

  const resetForm = () => {
    setNewUsername('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('EMPLOYEE');
    setNewPerms(['dashboard', 'pos', 'inventory']);
    setIsEditing(false);
    setEditingProfile(null);
  };

  const handleEditClick = (profile: Profile) => {
    setEditingProfile(profile);
    setNewUsername(profile.username);
    setNewEmail(''); // We don't have email in profile, and auth.signUp uses it. On edit, we only change if provided.
    setNewPassword(''); 
    setNewRole(profile.role);
    setNewPerms(profile.permissions);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleTogglePerm = (perm: string) => {
    if (newPerms.includes(perm)) {
      setNewPerms(newPerms.filter(p => p !== perm));
    } else {
      setNewPerms([...newPerms, perm]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && editingProfile) {
        // Update via Edge Function to handle auth/passwords securely
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'updateUser',
            userId: editingProfile.user_id,
            username: newUsername,
            password: newPassword || undefined,
            role: newRole,
            permissions: newPerms
          }
        });

        if (error || data?.error) throw new Error(error?.message || data?.error);
        
        setNotification({ message: 'Usuário atualizado com sucesso!', type: 'success' });
      } else {
        // Create new user via Edge Function to avoid auto-login of the new user
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'createUser',
            email: newEmail,
            password: newPassword,
            username: newUsername,
            role: newRole,
            permissions: newPerms
          }
        });

        if (error || data?.error) throw new Error(error?.message || data?.error);
        
        setNotification({ message: 'Usuário criado com sucesso!', type: 'success' });
      }

      setShowForm(false);
      resetForm();
      fetchProfiles();
    } catch (err: any) {
      setNotification({ message: 'Erro na operação: ' + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="personnel-container fade-in">
      {notification && (
        <div className={`toast-notification ${notification.type} slide-down`}>
          <div className="toast-content">
            {notification.type === 'success' ? <ShieldCheck size={20} /> : <ArrowLeft size={20} />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      <div className="view-header-tabs" style={{ marginBottom: '24px' }}>
        <button 
          className={`tab-btn ${innerTab === 'personnel' ? 'active' : ''}`}
          onClick={() => {
            setInnerTab('personnel');
            setShowForm(false);
            resetForm();
          }}
        >
          <UserCog size={18} />
          Equipe Fiscal
        </button>
        <button 
          className={`tab-btn ${innerTab === 'customers' ? 'active' : ''}`}
          onClick={() => setInnerTab('customers')}
        >
          <Users size={18} />
          Clientes Cadastrados
        </button>
      </div>

      <div className="tab-content">
        {innerTab === 'customers' ? (
          <CustomersView />
        ) : (
          showForm ? (
            <div className="form-view-overlay fade-in">
              <div className="form-premium-card slide-up">
                <div className="form-card-header">
                  <button className="btn-icon-back" onClick={() => { setShowForm(false); resetForm(); }}>
                    <ArrowLeft size={20} />
                  </button>
                  <div className="header-text">
                    <h2>{isEditing ? 'Editar Acesso' : 'Novo Acesso'}</h2>
                    <p>{isEditing ? `Modificando dados de @${editingProfile?.username}` : 'Cadastre um novo membro para sua equipe'}</p>
                  </div>
                </div>
                
                <form onSubmit={handleCreateUser} className="premium-form">
                  <div className="form-sections-grid">
                    <div className="form-section">
                      <h3 className="section-title"><Fingerprint size={16} /> Dados de Acesso</h3>
                      <div className="input-group-v2">
                        <label>Identificador (Username)</label>
                        <div className="input-with-icon">
                          <UserCog className="field-icon" size={18} />
                          <input 
                            required 
                            type="text" 
                            value={newUsername} 
                            onChange={(e) => setNewUsername(e.target.value)} 
                            placeholder="@joao_balcao" 
                          />
                        </div>
                      </div>
                      
                      {!isEditing && (
                        <div className="input-group-v2">
                          <label>E-mail Corporativo</label>
                          <div className="input-with-icon">
                            <Mail className="field-icon" size={18} />
                            <input 
                              required={!isEditing}
                              type="email" 
                              value={newEmail} 
                              onChange={(e) => setNewEmail(e.target.value)} 
                              placeholder="email@aralimentos.com" 
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="input-group-v2">
                        <label>{isEditing ? 'Nova Senha (deixe vazio para manter)' : 'Senha Provisória'}</label>
                        <div className="input-with-icon">
                          <Key className="field-icon" size={18} />
                          <input 
                            required={!isEditing}
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder={isEditing ? 'Opcional' : 'Mínimo 6 caracteres'} 
                          />
                        </div>
                      </div>

                    </div>

                    <div className="form-section">
                      <h3 className="section-title"><ShieldCheck size={16} /> Hierarquia e Acessos</h3>
                      <div className="input-group-v2">
                        <label>Nível de Hierarquia</label>
                        <div className="select-v2">
                          <select value={newRole} onChange={(e) => {
                            const role = e.target.value;
                            setNewRole(role);
                            if (role === 'ADMIN') {
                              // Auto-select all perms for Admin
                              setNewPerms(Object.keys(PERMISSION_LABELS));
                            }
                          }}>
                            <option value="EMPLOYEE">Funcionário (Acesso Limitado)</option>
                            <option value="ADMIN">Administrador (Acesso Total)</option>
                          </select>
                        </div>
                      </div>

                      {newRole === 'EMPLOYEE' && (
                        <div className="perms-selection-area fade-in">
                          <h3 className="section-title" style={{ marginTop: '24px' }}>
                            <ShieldCheck size={16} /> Módulos Disponíveis
                          </h3>
                          <p className="section-desc">Selecione quais abas este usuário poderá visualizar no sistema.</p>
                          
                          <div className="perms-premium-grid">
                            {Object.entries(PERMISSION_LABELS).map(([key, info]) => (
                              <button 
                                key={key} 
                                type="button"
                                className={`perm-card-btn ${newPerms.includes(key) ? 'active' : ''}`}
                                onClick={() => handleTogglePerm(key)}
                              >
                                <div className="perm-icon-box">
                                  <info.icon size={20} />
                                </div>
                                <span className="perm-name">{info.label}</span>
                                <div className="perm-check">
                                  <div className="check-circle" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {newRole === 'ADMIN' && (
                        <div className="admin-info-box fade-in">
                          <ShieldCheck size={20} />
                          <p><strong>Acesso Total:</strong> Administradores possuem permissão automática para visualizar e gerenciar todos os módulos do sistema.</p>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="form-footer-premium">
                    <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-cancel-v2">
                      Descartar
                    </button>
                    <button type="submit" className="btn-submit-v2" disabled={loading}>
                      {loading ? 'Processando...' : (isEditing ? 'Salvar Alterações' : 'Finalizar e Ativar Acesso')}
                      {!loading && <ChevronRight size={18} />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="view fade-in">
              <div className="view-header-premium">
                <div className="header-info">
                  <h2>Gestão de Equipe</h2>
                  <p className="subtitle">Administre os acessos e funções de cada colaborador</p>
                </div>
                <button className="btn-add-premium" onClick={() => { setShowForm(true); setIsEditing(false); }}>
                  <Plus size={20} />
                  Cadastrar Colaborador
                </button>
              </div>

              <div className="users-grid-premium">
                {profiles.map(p => (
                  <div key={p.id} className="user-card-premium fade-in">
                    <div className="user-card-top">
                      <div className="user-avatar-premium">
                        <div className="avatar-square">
                          {p.role === 'ADMIN' ? <ShieldCheck size={24} /> : <UserCog size={24} />}
                        </div>
                      </div>
                      <div className="user-main-info">
                        <h3>@{p.username}</h3>
                        <span className={`role-tag-premium ${p.role.toLowerCase()}`}>
                          {p.role === 'ADMIN' ? 'ADMINISTRADOR' : 'COLABORADOR'}
                        </span>
                      </div>
                      <button className="btn-edit-user" onClick={() => handleEditClick(p)} title="Editar Usuário">
                        <Edit3 size={18} />
                      </button>
                    </div>
                    
                    <div className="user-card-perms">
                      <div className="perms-title-row">
                        <Fingerprint size={14} />
                        <span>Acessos Habilitados:</span>
                      </div>
                      <div className="perms-capsules">
                        {p.permissions.map(perm => (
                          <span key={perm} className="perm-capsule">
                            {PERMISSION_LABELS[perm]?.label || perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
      
      <style>{`
        .personnel-container {
          display: flex;
          flex-direction: column;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Tabs Styling */
        .view-header-tabs {
          display: flex;
          gap: 12px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid var(--border);
          width: fit-content;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 700;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.5);
          color: var(--primary);
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 8px 16px rgba(30, 136, 229, 0.2);
        }

        /* View Header Premium */
        .view-header-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .header-info h2 { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px; }
        .subtitle { color: var(--text-muted); font-size: 0.95rem; }

        .btn-add-premium {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--primary);
          color: white;
          padding: 14px 28px;
          border-radius: 16px;
          font-weight: 700;
          box-shadow: 0 10px 20px rgba(30, 136, 229, 0.2);
          transition: all 0.3s;
        }

        .btn-add-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(30, 136, 229, 0.3);
        }

        /* Users Grid Premium */
        .users-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .user-card-premium {
          background: white;
          border-radius: 24px;
          border: 1px solid var(--border);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: all 0.3s;
          position: relative;
        }

        .user-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.05);
          border-color: var(--primary-light);
        }

        .user-card-top {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .avatar-square {
          width: 56px;
          height: 56px;
          background: var(--bg-main);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .user-main-info { flex: 1; }
        .user-main-info h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 4px; }
        .role-tag-premium {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          letter-spacing: 0.5px;
        }
        .role-tag-premium.admin { background: #E3F2FD; color: #1565C0; }
        .role-tag-premium.employee { background: #F5F5F5; color: #616161; }

        .btn-edit-user {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--bg-main);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-edit-user:hover { 
          background: var(--primary-light); 
          color: var(--primary);
          transform: scale(1.1);
        }

        .perms-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .perms-capsules { display: flex; flex-wrap: wrap; gap: 8px; }
        .perm-capsule {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 6px 12px;
          background: var(--bg-main);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-main);
        }

        /* Form Premium Overlay */
        .form-view-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(240, 242, 245, 0.8);
          backdrop-filter: blur(12px);
          z-index: 5000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .form-premium-card {
          background: white;
          width: 100%;
          max-width: 900px;
          border-radius: 32px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.5);
        }

        .form-card-header {
          padding: 32px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .btn-icon-back {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: white;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .btn-icon-back:hover { background: var(--bg-main); color: var(--text-main); }

        .header-text h2 { font-size: 1.5rem; font-weight: 800; color: var(--text-main); }
        .header-text p { color: var(--text-muted); font-size: 0.9rem; }

        .premium-form { padding: 32px; }

        .form-sections-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 24px;
        }

        .section-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; }

        .input-group-v2 { margin-bottom: 20px; }
        .input-group-v2 label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; padding-left: 4px; }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon { position: absolute; left: 16px; color: var(--text-muted); pointer-events: none; }
        .input-with-icon input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          background: var(--bg-main);
          border: 2px solid transparent;
          border-radius: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .input-with-icon input:focus {
          background: white;
          border-color: var(--primary-light);
          box-shadow: 0 0 0 4px rgba(30, 136, 229, 0.1);
        }

        .select-v2 select {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-main);
          border-radius: 16px;
          border: 2px solid transparent;
          font-weight: 600;
          cursor: pointer;
        }

        /* Permissions Grid */
        .perms-premium-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .perm-card-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-main);
          border: 2px solid transparent;
          border-radius: 18px;
          text-align: left;
          transition: all 0.2s;
        }

        .perm-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .perm-name { font-size: 0.85rem; font-weight: 700; color: var(--text-main); flex: 1; }

        .perm-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        .check-circle { width: 10px; height: 10px; border-radius: 50%; opacity: 0; transition: all 0.2s; }

        .perm-card-btn.active {
          background: #E3F2FD;
          border-color: var(--primary-light);
        }
        .perm-card-btn.active .perm-icon-box { background: var(--primary); color: white; }
        .perm-card-btn.active .perm-check { border-color: var(--primary); }
        .perm-card-btn.active .check-circle { opacity: 1; background: var(--primary); }

        .admin-info-box {
          margin-top: 24px;
          padding: 20px;
          background: #E3F2FD;
          border: 1px solid var(--primary-light);
          border-radius: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #1565C0;
        }
        .admin-info-box p { font-size: 0.9rem; margin: 0; line-height: 1.5; }

        .form-footer-premium {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }

        .btn-cancel-v2 {
          padding: 14px 32px;
          border-radius: 14px;
          font-weight: 700;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .btn-cancel-v2:hover { background: #fee2e2; color: #dc2626; }

        .btn-submit-v2 {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--primary);
          color: white;
          padding: 14px 40px;
          border-radius: 14px;
          font-weight: 700;
          box-shadow: 0 10px 20px rgba(30, 136, 229, 0.2);
          transition: all 0.2s;
        }
        .btn-submit-v2:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 15px 30px rgba(30, 136, 229, 0.3);
        }

        @media (max-width: 768px) {
          .view-header-premium { flex-direction: column; align-items: flex-start; gap: 20px; }
          .btn-add-premium { width: 100%; justify-content: center; }
          .form-sections-grid { grid-template-columns: 1fr; gap: 24px; }
          .perms-premium-grid { grid-template-columns: 1fr; }
          .form-premium-card { height: 100%; border-radius: 0; overflow-y: auto; }
          .form-view-overlay { padding: 0; }
          .premium-form { padding: 20px; padding-bottom: 40px; }
        }

        /* Toast Notifications */
        .toast-notification {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          min-width: 300px;
          max-width: 90vw;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: slideDown 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        .toast-notification.success {
          background: #E8F5E9;
          color: #2E7D32;
          border: 1px solid #A5D6A7;
        }

        .toast-notification.error {
          background: #FFEBEE;
          color: #C62828;
          border: 1px solid #FFCDD2;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 0.95rem;
        }

        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }


      `}</style>
    </div>
  );
};

export default PersonnelView;


