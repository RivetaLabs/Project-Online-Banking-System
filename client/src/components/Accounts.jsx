import { useEffect, useState } from 'react';

function money(value) {
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function Accounts({ page, onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch('/api/accounts');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setAccounts(data);
        if (data.length > 0) setSelected(data[0]);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  if (page !== 'Accounts') {
    return (
      <section className="panel">
        <h2>{page}</h2>
        <p>Planned for Phase 2.</p>
        <button onClick={() => onNavigate('Accounts')}>Back to accounts</button>
      </section>
    );
  }

  let content;
  if (loading) {
    content = <p>Loading accounts...</p>;
  } else if (error) {
    content = <p role="alert">{error}</p>;
  } else if (accounts.length === 0) {
    content = <p>No bank accounts yet.</p>;
  } else {
    content = (
      <>
        <div className="accounts">
          {accounts.map(account => (
            <button className="panel account" key={account.id}
              aria-pressed={selected.id === account.id} onClick={() => setSelected(account)}>
              <span>{account.type}</span>
              <strong>{money(account.balance)}</strong>
              <span>Account {account.number}</span>
            </button>
          ))}
        </div>
        <TransactionHistory key={selected.id} account={selected} />
      </>
    );
  }

  return (
    <>
      <h2>Your accounts</h2>
      {content}
    </>
  );
}

function TransactionHistory({ account }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTransactions() {
      try {
        const response = await fetch('/api/accounts/' + account.id + '/transactions');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTransactions(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, [account.id]);

  let content;
  if (loading) {
    content = <p>Loading history...</p>;
  } else if (error) {
    content = <p role="alert">{error}</p>;
  } else if (transactions.length === 0) {
    content = <p>No transactions yet.</p>;
  } else {
    content = (
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Transaction history">
        <table>
          <caption>Selected account transactions, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Description</th>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{transaction.date}</td>
                <td>{transaction.description}</td>
                <td>{transaction.type}</td>
                <td>{money(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <h2>{account.type} transaction history</h2>
      {content}
    </>
  );
}
