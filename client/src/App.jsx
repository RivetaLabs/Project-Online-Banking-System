import { useEffect, useState } from 'react';

async function api(path, body) {
  const response = await fetch('/api' + path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
const money = value => Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState('Login');
  const [accounts, setAccounts] = useState(null);
  const [selected, setSelected] = useState('');
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/me').then(setUser).catch(e => setError(e.message)).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    api('/accounts').then(rows => {
      if (!active) return;
      setAccounts(rows);
      setSelected(String(rows[0]?.id || ''));
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    api('/accounts/' + selected + '/transactions').then(rows => {
      if (active) setTransactions(rows);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [selected]);

  async function authenticate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api(page === 'Register' ? '/register' : '/login', fields);
      if (page === 'Register') {
        setPage('Login');
        setNotice(data.message);
      } else {
        setUser(data);
        setPage('Accounts');
      }
      form.reset();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try {
      await api('/logout', {});
      setUser(null);
      setAccounts(null);
      setSelected('');
      setTransactions(null);
      setPage('Login');
      setError('');
      setNotice('');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!ready) return <main><p>Loading...</p></main>;
  return <main>
    <header><p className="brand">Jacob Dennis &amp; Co.</p>
      {user && <button onClick={logout} disabled={busy}>Log out</button>}
    </header>
    <p className="muted">Class demo | Fictional accounts</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!user ? <section className="panel auth">
      <h1>{page}</h1>
      <form onSubmit={authenticate}>
        {page === 'Register' && <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>}
        <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required minLength={8} maxLength={128}
          autoComplete={page === 'Register' ? 'new-password' : 'current-password'} /></label>
        <button disabled={busy}>{busy ? 'Please wait...' : page}</button>
      </form>
      <button className="link" disabled={busy} onClick={() => {
        setPage(page === 'Register' ? 'Login' : 'Register'); setError(''); setNotice('');
      }}>{page === 'Register' ? 'Back to login' : 'Create an account'}</button>
    </section> : <>
      <h1>Hello, {user.name}</h1>
      <nav aria-label="Bank sections">{['Accounts', 'Transfers', 'Bill payments', 'Statements', 'Insights'].map(item =>
        <button key={item} aria-current={page === item ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>
      )}</nav>
      {!['Accounts', 'Login'].includes(page) ? <section className="panel">
        <h2>{page}</h2><p>Planned for Phase 2.</p>
        <button onClick={() => setPage('Accounts')}>Back to accounts</button>
      </section> : <>
        <h2>Your accounts</h2>
        {accounts === null ? <p>Loading accounts...</p> : accounts.length === 0 ? <p>No bank accounts yet.</p> : <>
          <div className="accounts">{accounts.map(account => <button className="panel account" key={account.id}
            aria-pressed={selected === String(account.id)} onClick={() => {
              if (selected === String(account.id)) return;
              setError(''); setTransactions(null); setSelected(String(account.id));
            }}>
            <span>{account.type}</span><strong>{money(account.balance)}</strong><span>Account {account.number}</span>
          </button>)}</div>
          <h2>{accounts.find(a => String(a.id) === selected)?.type} transaction history</h2>
          {transactions === null ? <p>Loading history...</p> : transactions.length === 0 ? <p>No transactions yet.</p> :
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Transaction history">
              <table><caption>Selected account transactions, newest first</caption>
                <thead><tr>{['Date', 'Description', 'Type', 'Amount'].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
                <tbody>{transactions.map(t => <tr key={t.id}>
                  <td>{t.date}</td><td>{t.description}</td><td>{t.type}</td><td>{money(t.amount)}</td>
                </tr>)}</tbody>
              </table>
            </div>}
        </>}
      </>}
    </>}
  </main>;
}