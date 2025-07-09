-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role ENUM('husband', 'wife') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Allocation ratios table
CREATE TABLE IF NOT EXISTS allocation_ratios (
  id VARCHAR(255) PRIMARY KEY,
  husband_ratio DECIMAL(3,2) NOT NULL CHECK (husband_ratio >= 0 AND husband_ratio <= 1),
  wife_ratio DECIMAL(3,2) NOT NULL CHECK (wife_ratio >= 0 AND wife_ratio <= 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (ABS(husband_ratio + wife_ratio - 1.0) < 0.001)
);

-- Expenses table (with monthly tracking)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(255) PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount INT NOT NULL CHECK (amount > 0),
  payer_id VARCHAR(255) NOT NULL,
  expense_year INT NOT NULL,
  expense_month INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (expense_year >= 2020 AND expense_year <= 2099),
  CHECK (expense_month >= 1 AND expense_month <= 12)
);

-- Settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(255) PRIMARY KEY,
  expense_id VARCHAR(255) NOT NULL,
  husband_amount INT NOT NULL,
  wife_amount INT NOT NULL,
  payer ENUM('husband', 'wife') NOT NULL,
  receiver ENUM('husband', 'wife') NOT NULL,
  settlement_amount INT NOT NULL,
  status ENUM('pending', 'approved', 'completed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
); 
