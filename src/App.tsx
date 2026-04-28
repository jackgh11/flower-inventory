import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Leaf, Package, Flower, ClipboardList, Activity, Globe } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Flowers from './pages/Flowers';
import Bouquets from './pages/Bouquets';
import Orders from './pages/Orders';
import StockLog from './pages/StockLog';

/** Temporary Vercel/static deploy: login without backend. Remove when API is wired. */
const FRONTEND_AUTH_STORAGE_KEY = 'inventory_frontend_auth';
const FRONTEND_SESSION_TOKEN = '__frontend_session__';
const FRONTEND_USER = 'jack';
const FRONTEND_PASS = 'loraghneim';

function Sidebar({ isRTL, toggleLanguage, onLogout }: { isRTL: boolean, toggleLanguage: () => void, onLogout: () => void }) {
  const location = useLocation();
  const menu = [
    { name: isRTL ? 'لوحة القيادة' : 'Dashboard', path: '/', icon: <Activity size={20} /> },
    { name: isRTL ? 'المواد' : 'Materials', path: '/materials', icon: <Package size={20} /> },
    { name: isRTL ? 'الزهور' : 'Flowers', path: '/flowers', icon: <Flower size={20} /> },
    { name: isRTL ? 'الباقات' : 'Bouquets', path: '/bouquets', icon: <ClipboardList size={20} /> },
    { name: isRTL ? 'الطلبات' : 'Orders', path: '/orders', icon: <ClipboardList size={20} /> },
    { name: isRTL ? 'مخزون' : 'Stock Log', path: '/stock-log', icon: <Leaf size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <Flower />
        <span>{isRTL ? 'إدارة المخزون' : 'Inventory'}</span>
      </div>
      <nav style={{ flex: 1 }}>
        {menu.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>
      <button className="btn secondary" onClick={onLogout} style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
        {isRTL ? 'تسجيل خروج' : 'Logout'}
      </button>
      <button className="btn secondary" onClick={toggleLanguage} style={{ justifyContent: 'center' }}>
        <Globe size={18} />
        {isRTL ? 'English' : 'عربي'}
      </button>
    </div>
  );
}

function Layout({ isRTL, toggleLanguage, onLogout }: { isRTL: boolean, toggleLanguage: () => void, onLogout: () => void }) {
  return (
    <div className="app-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar isRTL={isRTL} toggleLanguage={toggleLanguage} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard isRTL={isRTL} />} />
          <Route path="/materials" element={<Materials isRTL={isRTL} />} />
          <Route path="/flowers" element={<Flowers isRTL={isRTL} />} />
          <Route path="/bouquets" element={<Bouquets isRTL={isRTL} />} />
          <Route path="/orders" element={<Orders isRTL={isRTL} />} />
          <Route path="/stock-log" element={<StockLog isRTL={isRTL} />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginScreen({
  isRTL,
  onLogin,
}: {
  isRTL: boolean;
  onLogin: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username === FRONTEND_USER && password === FRONTEND_PASS) {
      localStorage.setItem(FRONTEND_AUTH_STORAGE_KEY, '1');
      onLogin();
    } else {
      setError(isRTL ? 'بيانات الدخول غير صحيحة' : 'Invalid username or password');
    }
  };

  return (
    <div className="auth-shell" dir={isRTL ? 'rtl' : 'ltr'}>
      <form className="auth-card card" onSubmit={submit}>
        <h2 style={{ marginBottom: '0.5rem' }}>{isRTL ? 'تسجيل الدخول' : 'Sign in'}</h2>
        <p style={{ color: 'var(--color-text-light)', marginTop: 0 }}>
          {isRTL ? 'أدخل بيانات الدخول للوصول للمخزون' : 'Enter credentials to access inventory'}
        </p>
        <div className="form-group">
          <label>{isRTL ? 'اسم المستخدم' : 'Username'}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>{isRTL ? 'كلمة المرور' : 'Password'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: 'var(--color-danger)', marginTop: 0 }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
          {isRTL ? 'دخول' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [isRTL, setIsRTL] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(FRONTEND_AUTH_STORAGE_KEY) === '1') {
      return FRONTEND_SESSION_TOKEN;
    }
    return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  });
  const [authReady, setAuthReady] = useState(false);
  const toggleLanguage = () => setIsRTL(prev => !prev);

  useEffect(() => {
    if (localStorage.getItem(FRONTEND_AUTH_STORAGE_KEY) === '1') {
      delete axios.defaults.headers.common.Authorization;
      setToken(FRONTEND_SESSION_TOKEN);
      setAuthReady(true);
      return;
    }

    const existing = localStorage.getItem('auth_token');
    if (!existing) {
      delete axios.defaults.headers.common.Authorization;
      setAuthReady(true);
      return;
    }
    axios.defaults.headers.common.Authorization = `Bearer ${existing}`;
    axios.get('/api/auth/me', { timeout: 5000 })
      .then(() => setToken(existing))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        delete axios.defaults.headers.common.Authorization;
      })
      .finally(() => setAuthReady(true));
  }, []);

  const handleFrontendLogin = () => {
    delete axios.defaults.headers.common.Authorization;
    setToken(FRONTEND_SESSION_TOKEN);
  };

  const handleLogout = () => {
    localStorage.removeItem(FRONTEND_AUTH_STORAGE_KEY);
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common.Authorization;
    setToken(null);
  };

  if (!authReady) return <div style={{ padding: '2rem' }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <BrowserRouter>
      {token ? (
        <Layout isRTL={isRTL} toggleLanguage={toggleLanguage} onLogout={handleLogout} />
      ) : (
        <LoginScreen isRTL={isRTL} onLogin={handleFrontendLogin} />
      )}
    </BrowserRouter>
  );
}
