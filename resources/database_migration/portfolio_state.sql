CREATE TABLE portfolio_accounts (
  userid INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash_balance_cents NUMERIC(30, 0) NOT NULL DEFAULT 0,
  reserved_cash_cents NUMERIC(30, 0) NOT NULL DEFAULT 0
);

CREATE TABLE portfolio_positions (
  userid INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrumentid INT NOT NULL REFERENCES instruments(id),
  quantity INT NOT NULL DEFAULT 0,
  cost_basis_cents NUMERIC(30, 0) NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  PRIMARY KEY (userid, instrumentid)
);
