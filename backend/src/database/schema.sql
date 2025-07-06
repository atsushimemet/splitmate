-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('husband', 'wife')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Allocation ratios table
CREATE TABLE IF NOT EXISTS allocation_ratios (
  id TEXT PRIMARY KEY,
  husband_ratio REAL NOT NULL CHECK (husband_ratio >= 0 AND husband_ratio <= 1),
  wife_ratio REAL NOT NULL CHECK (wife_ratio >= 0 AND wife_ratio <= 1),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (ABS(husband_ratio + wife_ratio - 1.0) < 0.001)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  entered_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entered_by) REFERENCES users(id)
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  husband_amount INTEGER NOT NULL,
  wife_amount INTEGER NOT NULL,
  payer TEXT NOT NULL CHECK (payer IN ('husband', 'wife')),
  receiver TEXT NOT NULL CHECK (receiver IN ('husband', 'wife')),
  settlement_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_entered_by ON expenses(entered_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_settlements_expense_id ON settlements(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status); 
