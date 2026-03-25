import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { Lock, Mail, Loader2, Package, ShoppingCart, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import loginBg from '../../assets/login-bg.png';

const LoginView: React.FC = () => {
  const { settings } = useSystemSettings();
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
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else if (loginError.message === 'Invalid login credentials') {
        setError('Email ou senha inválidos.');
      } else {
        setError(loginError.message);
      }
    }
    setLoading(false);
  };

  const featureItems = [
    { icon: <Package size={20} />, text: 'Controle de Estoque Inteligente' },
    { icon: <ShoppingCart size={20} />, text: 'PDV Ágil e Intuitivo' },
    { icon: <TrendingUp size={20} />, text: 'Relatórios Financeiros Reais' },
    { icon: <Users size={20} />, text: 'Gestão de Clientes e Fiados' },
  ];

  return (
    <div className="login-screen fade-in">
      {/* Background global animado — sempre visível */}
      <div className="global-bg">
        <img src={loginBg} alt="" className="bg-image ken-burns" />
        <div className="mesh-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
        </div>
        <div className="bg-gradient-overlay" />
      </div>

      {/* Conteúdo: Grid de duas colunas */}
      <div className="login-content">
        {/* Painel esquerdo com features */}
        <div className="info-panel">
          <div className="system-intro">
            <span className="badge">Sistema Premium</span>
            <h1>Simplifique a Gestão do seu <span className="highlight">Hortifruti</span></h1>
            <p className="description">
              A ferramenta definitiva para controle de estoque, vendas e crescimento do seu negócio de alimentos.
            </p>
            
            <div className="features-grid">
              {featureItems.map((item, idx) => (
                <div key={idx} className="feature-pill">
                  <span className="pill-icon">{item.icon}</span>
                  <span>{item.text}</span>
                  <CheckCircle2 size={14} className="check-icon" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="side-footer">
            <p>© {new Date().getFullYear()} {settings?.system_name || 'A&R Alimentos'} • Gestão de Excelência</p>
          </div>
        </div>

        {/* Painel direito com formulário */}
        <div className="form-panel">
          <div className="glass-card">
            <div className="login-header">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="system-logo" />
              ) : (
                <div className="logo-placeholder premium-gradient">
                  {settings?.system_name?.substring(0, 1) || 'A'}
                </div>
              )}
              <h2>Bem-vindo de volta</h2>
              <p className="subtitle">Entre com suas credenciais para acessar o painel</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              {error && <div className="login-error-toast">{error}</div>}
              
              <div className="modern-input-group">
                <label><Mail size={16} /> E-mail</label>
                <div className="input-wrapper">
                  <input 
                    type="email" 
                    placeholder="exemplo@aralimentos.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modern-input-group">
                <label><Lock size={16} /> Senha</label>
                <div className="input-wrapper">
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn-modern-submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Acessar Sistema'}
              </button>
            </form>

            <p className="version-info">Versão 3.0 • Premium Control</p>
          </div>
        </div>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        /* ============ BACKGROUND GLOBAL ANIMADO ============ */
        .global-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: #0a1628;
        }

        .bg-image {
          position: absolute;
          inset: -20px;
          width: calc(100% + 40px);
          height: calc(100% + 40px);
          object-fit: cover;
          filter: brightness(0.35) saturate(1.3) blur(4px);
        }

        .ken-burns {
          animation: kenBurns 25s ease-in-out infinite alternate;
        }

        @keyframes kenBurns {
          0%   { transform: scale(1.0) translate(0, 0); }
          50%  { transform: scale(1.08) translate(-1%, 1%); }
          100% { transform: scale(1.15) translate(-2%, -1%); }
        }

        .mesh-blobs {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          mix-blend-mode: screen;
        }

        .blob-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%);
          top: -10%; left: -10%;
          animation: floatBlob1 18s ease-in-out infinite alternate;
        }
        .blob-2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(234,179,8,0.4) 0%, transparent 70%);
          bottom: -15%; right: -10%;
          animation: floatBlob2 22s ease-in-out infinite alternate;
        }
        .blob-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%);
          top: 40%; left: 30%;
          animation: floatBlob3 20s ease-in-out infinite alternate;
        }
        .blob-4 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%);
          top: 10%; right: 20%;
          animation: floatBlob4 16s ease-in-out infinite alternate;
        }

        @keyframes floatBlob1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(15%, 20%) scale(1.2); }
        }
        @keyframes floatBlob2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-10%, -15%) scale(1.15); }
        }
        @keyframes floatBlob3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-20%, 10%) scale(0.85); }
        }
        @keyframes floatBlob4 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(10%, -20%) scale(1.1); }
        }

        .bg-gradient-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          background: linear-gradient(
            135deg,
            rgba(10,22,40,0.7) 0%,
            rgba(10,22,40,0.3) 50%,
            rgba(10,22,40,0.6) 100%
          );
        }

        /* ============ CONTEÚDO ============ */
        .login-content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 480px;
          gap: 0;
        }

        /* Info Panel */
        .info-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px;
          color: white;
        }

        .system-intro { margin: auto 0; }
        .system-intro h1 { font-size: 3.2rem; font-weight: 800; line-height: 1.1; margin-bottom: 24px; color: #fff; }
        .highlight { color: #4ade80; text-shadow: 0 0 40px rgba(74, 222, 128, 0.6); }
        .description { font-size: 1.15rem; color: rgba(255,255,255,0.75); margin-bottom: 40px; line-height: 1.6; }

        .badge {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          padding: 6px 18px;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 24px;
          display: inline-block;
          border: 1px solid rgba(74, 222, 128, 0.25);
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .feature-pill {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 16px 18px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          animation: slideUp 0.6s ease-out backwards;
          font-size: 0.9rem;
        }

        .feature-pill:nth-child(1) { animation-delay: 0.05s; }
        .feature-pill:nth-child(2) { animation-delay: 0.1s; }
        .feature-pill:nth-child(3) { animation-delay: 0.15s; }
        .feature-pill:nth-child(4) { animation-delay: 0.2s; }

        .feature-pill:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-4px);
          border-color: rgba(74, 222, 128, 0.4);
          box-shadow: 0 12px 40px -10px rgba(0,0,0,0.4);
        }

        .pill-icon {
          width: 38px; height: 38px;
          min-width: 38px;
          background: rgba(74, 222, 128, 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4ade80;
        }

        .check-icon { margin-left: auto; color: #4ade80; opacity: 0.5; }
        .side-footer { margin-top: auto; font-size: 0.85rem; color: rgba(255,255,255,0.35); }

        /* Form Panel */
        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .glass-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 48px 40px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.5);
          text-align: center;
          animation: slideInRight 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          color: white;
        }

        .system-logo { width: 72px; height: 72px; border-radius: 18px; object-fit: contain; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
        .logo-placeholder { width: 72px; height: 72px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: white; margin: 0 auto 20px; font-weight: 800; }

        .login-header h2 { font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .subtitle { color: rgba(255,255,255,0.55); font-size: 0.9rem; margin-bottom: 36px; }

        .modern-input-group { margin-bottom: 22px; text-align: left; }
        .modern-input-group label { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.7); margin-bottom: 8px; padding-left: 4px; }
        
        .input-wrapper {
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          transition: all 0.3s ease;
        }

        .input-wrapper:focus-within {
          background: rgba(255,255,255,0.12);
          border-color: #4ade80;
          box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 16px;
          background: none;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #fff;
          font-weight: 500;
        }

        .input-wrapper input::placeholder { color: rgba(255,255,255,0.35); }

        .btn-modern-submit {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 16px;
          box-shadow: 0 8px 25px -5px rgba(34, 197, 94, 0.4);
        }

        .btn-modern-submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 14px 35px -5px rgba(34, 197, 94, 0.5);
          filter: brightness(1.1);
        }

        .btn-modern-submit:active { transform: translateY(-1px); }
        .btn-modern-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .login-error-toast {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 14px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 20px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          animation: shake 0.4s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .version-info { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin-top: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(60px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        /* ============ MOBILE ============ */
        @media (max-width: 1024px) {
          .login-content {
            grid-template-columns: 1fr;
            min-height: 100vh;
          }
          .info-panel { display: none; }
          .form-panel {
            min-height: 100vh;
            padding: 30px 20px;
          }
          .glass-card {
            max-width: 380px;
            padding: 36px 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginView;
