import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
const hash = promisify(scrypt);
const db = new pg.Client();
await db.connect();
try {
  await db.query('BEGIN');
  await db.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  for (const [name, email, prefix] of [
    ['Jacob', 'jacob@example.test', '100'],
    ['Other User', 'other@example.test', '200']
  ]) {
    const salt = randomBytes(16).toString('hex');
    const key = await hash('DemoOnly123!', salt, 64, { N: 32768, maxmem: 67108864 });
    const user = await db.query(
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id',
      [name, email, salt + ':' + key.toString('hex')]);
    if (!user.rowCount) continue;
    for (const [type, suffix, balance] of [['Checking', '1042', '2450.00'], ['Savings', '2086', '5000.00']]) {
      const account = await db.query(
        'INSERT INTO accounts(user_id,number,type,balance) VALUES($1,$2,$3,$4) RETURNING id',
        [user.rows[0].id, prefix + suffix, type, balance]);
      const rows = type === 'Checking'
        ? [['2026-11-01', 'Paycheck', 'Deposit', '3000.00'], ['2026-11-03', 'ATM', 'Withdrawal', '-100.00'],
           ['2026-11-04', 'Transfer to savings', 'Transfer', '-400.00'], ['2026-11-05', 'Utility bill', 'Payment', '-50.00']]
        : [['2026-11-01', 'Opening deposit', 'Deposit', '4600.00'], ['2026-11-04', 'Transfer from checking', 'Transfer', '400.00']];
      for (const row of rows) await db.query(
        'INSERT INTO transactions(account_id,date,description,type,amount) VALUES($1,$2,$3,$4,$5)',
        [account.rows[0].id, ...row]);
    }
  }
  await db.query('COMMIT');
  console.log('Demo data ready. Existing users were left unchanged.');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}