import { useState } from 'react';

export default function AuthForm({ onLogin }) {
  const [page, setPage] = useState('Login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setSaving(true);
    setError('');
    setNotice('');

    let url = '/api/login';
    if (page === 'Register') url = '/api/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      form.reset();
      if (page === 'Register') {
        setPage('Login');
        setNotice(data.message);
      } else {
        onLogin(data);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function changePage() {
    if (page === 'Login') {
      setPage('Register');
    } else {
      setPage('Login');
    }
    setError('');
    setNotice('');
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <section className="panel auth">
        <h1>{page}</h1>
        <form onSubmit={handleSubmit}>
          {page === 'Register' && (
            <label>
              Name
              <input name="name" required maxLength={100} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={8} maxLength={128}
              autoComplete={page === 'Register' ? 'new-password' : 'current-password'} />
          </label>
          <button disabled={saving}>{saving ? 'Please wait...' : page}</button>
        </form>
        <button className="link" disabled={saving} onClick={changePage}>
          {page === 'Register' ? 'Back to login' : 'Create an account'}
        </button>
      </section>
    </>
  );
}
