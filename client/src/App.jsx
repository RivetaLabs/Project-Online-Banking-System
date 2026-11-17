import { useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import Accounts from './components/Accounts';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('Accounts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setUser(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    checkLogin();
  }, []);

  function handleLogin(user) {
    setUser(user);
    setPage('Accounts');
    setError('');
  }

  async function logout() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUser(null);
      setPage('Accounts');
    } 
    catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main><p>Loading...</p></main>;
  }

  return (
    <main>
      <header>
        <p className="brand">Jacob Dennis &amp; Co.</p>
        {user && <button onClick={logout} disabled={saving}>Log out</button>}
      </header>
      <p className="muted">Class demo | Fictional accounts</p>
      {error && <p role="alert">{error}</p>}

      {!user && <AuthForm onLogin={handleLogin} />}
      {user && (
        <>
          <h1>Hello, {user.name}</h1>
          <nav aria-label="Bank sections">
            {['Accounts', 'Transfers', 'Bill payments', 'Statements', 'Insights'].map(item => (
              <button key={item} onClick={() => setPage(item)}
                aria-current={page === item ? 'page' : undefined}>
                {item}
              </button>
            ))}
          </nav>
          <Accounts page={page} onNavigate={setPage} />
        </>
      )}
    </main>
  );
}
