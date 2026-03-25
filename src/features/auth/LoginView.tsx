import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { Lock, Mail, Loader2 } from 'lucide-react';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (loginError) {
      console.error('Login error:', loginError);
      if (loginError.message === 'Email not confirmed') {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada ou confirme no painel do Supabase.');
      } else if (loginError.message === 'Invalid login credentials') {
        setError('Email ou senha inválidos.');
      } else {
        setError(loginError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-container fade-in">
      <div className="login-card card">
        <div className="login-header">
          <div className="logo-circle premium-gradient">A&R</div>
          <h2>A&R Alimentos</h2>
          <p>Gestão Inteligente</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label><Mail size={16} /> E-mail</label>
            <input 
              type="email" 
              placeholder="ex: voce@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label><Lock size={16} /> Senha</label>
            <input 
              type="password" 
              placeholder="••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <p>Controle de Estoque e Vendas</p>
        </div>
      </div>

      <style>{`
        .login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-main); padding: 20px; }
        .login-card { width: 100%; max-width: 400px; padding: 40px 30px; text-align: center; border: 1px solid var(--border); }
        .logo-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 1.5rem; font-weight: 800; color: white; }
        .login-error { background: #ffebee; color: #d32f2f; padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px; text-align: center; border: 1px solid #ffcdd2; }
        .form-group { margin-bottom: 20px; text-align: left; }
        .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
        .btn-setup { background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; margin-top: 15px; display: flex; align-items: center; gap: 4px; width: 100%; justify-content: center; opacity: 0.7; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginView;
