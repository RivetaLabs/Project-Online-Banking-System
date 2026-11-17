CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  number VARCHAR(30) UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Checking', 'Savings')),
  balance NUMERIC(12,2) NOT NULL CHECK (balance >= 0)
);
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  date DATE NOT NULL,
  description VARCHAR(200) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Deposit', 'Withdrawal', 'Transfer', 'Payment')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount <> 0)
);
CREATE INDEX IF NOT EXISTS accounts_owner ON accounts(user_id);
CREATE INDEX IF NOT EXISTS transactions_account ON transactions(account_id);