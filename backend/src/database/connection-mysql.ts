import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'splitmate',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Initialize database
export async function initializeDatabase() {
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema-mysql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
      }
    }

    console.log('Database schema initialized');
    
    // Create indexes separately to handle duplicates
    await createIndexes();
    
    await seedInitialData();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Seed initial data
async function seedInitialData() {
  try {
    // Check if default users exist
    const [userRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const userCount = (userRows as any)[0].count;

    if (userCount === 0) {
      // Insert default users
      const defaultUsers = [
        { id: 'husband-001', name: '夫', role: 'husband' },
        { id: 'wife-001', name: '妻', role: 'wife' }
      ];

      for (const user of defaultUsers) {
        await pool.execute(
          'INSERT INTO users (id, name, role) VALUES (?, ?, ?)',
          [user.id, user.name, user.role]
        );
      }
      console.log('Default users created');
    }

    // Check if default allocation ratio exists
    const [ratioRows] = await pool.execute('SELECT COUNT(*) as count FROM allocation_ratios');
    const ratioCount = (ratioRows as any)[0].count;

    if (ratioCount === 0) {
      // Insert default allocation ratio (70% husband, 30% wife)
      await pool.execute(
        'INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio) VALUES (?, ?, ?)',
        ['default-ratio', 0.7, 0.3]
      );
      console.log('Default allocation ratio created (70% husband, 30% wife)');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

// Create indexes with error handling
async function createIndexes() {
  const indexes = [
    'CREATE INDEX idx_expenses_payer_id ON expenses(payer_id)',
    'CREATE INDEX idx_expenses_created_at ON expenses(created_at)',
    'CREATE INDEX idx_expenses_monthly ON expenses(expense_year, expense_month)',
    'CREATE INDEX idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id)',
    'CREATE INDEX idx_settlements_expense_id ON settlements(expense_id)',
    'CREATE INDEX idx_settlements_status ON settlements(status)'
  ];

  for (const indexSql of indexes) {
    try {
      await pool.execute(indexSql);
      console.log(`Index created: ${indexSql.substring(0, 50)}...`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`Index already exists, skipping: ${indexSql.substring(0, 50)}...`);
      } else {
        console.error(`Error creating index: ${error.message}`);
      }
    }
  }
}

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
} 
