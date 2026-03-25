import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Plus, ArrowLeft } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  role: string;
  permissions: string[];
}

const UsersManagementView: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  // ... (keep state)
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('EMPLOYEE');
  const [newPerms, setNewPerms] = useState<string[]>(['dashboard', 'pos', 'inventory']);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
    setLoading(false);
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
      const { data, error: signupError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { username: newUsername }
        }
      });

      if (signupError) throw signupError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            user_id: data.user.id,
            username: newUsername,
            role: newRole,
            permissions: newPerms
          }]);
        
        if (profileError) throw profileError;
        alert('Usuário criado com sucesso! Lembre-se de ativar o Self-Service Signup no Supabase.');
        setShowForm(false);
        fetchProfiles();
      }
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForm) {
    return (
      <div className="form-view fade-in">
        <div className="form-header-v2">
          <button className="btn-back" onClick={() => setShowForm(false)}>
            <ArrowLeft size={20} />
          </button>
          <h2>Novo Acesso</h2>
        </div>
        
        <div className="form-view-content">
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label">Identificador (Username)</label>
              <input required type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="ex: joao_balcao" />
            </div>
            
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@loja.com" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Senha Provisória</label>
              <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6+ caracteres" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Nível de Acesso</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="EMPLOYEE">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Abas Permitidas</label>
              <div className="toggle-grid">
                {['dashboard', 'inventory', 'pos', 'customers', 'purchases', 'users'].map(p => (
                  <button 
                    key={p} 
                    type="button"
                    className={`toggle-btn ${newPerms.includes(p) ? 'active' : ''}`}
                    onClick={() => handleTogglePerm(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={loading}>Criar Usuário</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="view fade-in">
      <div className="view-header">
        <h2>Gestão de Funcionários</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Novo Acesso
        </button>
      </div>

      <div className="users-list">
        {profiles.map(profile => (
          <div key={profile.id} className="card user-card">
            <div className="user-info">
              <span className="username">@{profile.username}</span>
              <span className={`role-badge ${profile.role.toLowerCase()}`}>
                {profile.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}
              </span>
            </div>
            <div className="user-perms">
              {profile.permissions.map(p => (
                <span key={p} className="perm-tag">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .users-list { display: flex; flex-direction: column; gap: 12px; }
        .user-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .user-info { display: flex; align-items: center; justify-content: space-between; }
        .username { font-weight: 700; color: var(--primary); }
        .role-badge { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: #eee; }
        .role-badge.admin { background: #e3f2fd; color: #1976d2; }
        .user-perms { display: flex; flex-wrap: wrap; gap: 6px; }
        .perm-tag { font-size: 0.6rem; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); }
      `}</style>
    </div>
  );
};

export default UsersManagementView;
