import mysql from 'mysql2/promise';

interface DbConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

export async function migrateDatabase() {
  const dbConfig: DbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'splitmate',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  console.log('🔄 Starting database migration...');
  console.log(`📍 Connecting to: ${dbConfig.host}:${dbConfig.port}`);

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔗 Connected to database');

    // Check if columns exist
    const [columns] = await connection.execute('DESCRIBE expenses') as any[];
    const hasExpenseYear = columns.some((col: any) => col.Field === 'expense_year');
    const hasExpenseMonth = columns.some((col: any) => col.Field === 'expense_month');

    if (!hasExpenseYear || !hasExpenseMonth) {
      console.log('📝 Adding expense_year and expense_month columns...');

      if (!hasExpenseYear) {
        // Add column without DEFAULT value
        await connection.execute('ALTER TABLE expenses ADD COLUMN expense_year INT');
        console.log('✅ Added expense_year column');
      }

      if (!hasExpenseMonth) {
        // Add column without DEFAULT value
        await connection.execute('ALTER TABLE expenses ADD COLUMN expense_month INT');
        console.log('✅ Added expense_month column');
      }

      // Update existing data to populate the new columns
      await connection.execute(`
        UPDATE expenses 
        SET expense_year = YEAR(created_at), 
            expense_month = MONTH(created_at) 
        WHERE expense_year IS NULL OR expense_month IS NULL
      `);
      console.log('✅ Updated existing data with created_at values');

      // Now make columns NOT NULL after populating them
      if (!hasExpenseYear) {
        await connection.execute('ALTER TABLE expenses MODIFY COLUMN expense_year INT NOT NULL');
        console.log('✅ Made expense_year NOT NULL');
      }

      if (!hasExpenseMonth) {
        await connection.execute('ALTER TABLE expenses MODIFY COLUMN expense_month INT NOT NULL');
        console.log('✅ Made expense_month NOT NULL');
      }

      // Add constraints (ignore errors if already exist)
      try {
        await connection.execute('ALTER TABLE expenses ADD CONSTRAINT check_expense_year CHECK (expense_year >= 2020 AND expense_year <= 2099)');
        console.log('✅ Added expense_year constraint');
      } catch (e) {
        console.log('⚠️  expense_year constraint may already exist');
      }

      try {
        await connection.execute('ALTER TABLE expenses ADD CONSTRAINT check_expense_month CHECK (expense_month >= 1 AND expense_month <= 12)');
        console.log('✅ Added expense_month constraint');
      } catch (e) {
        console.log('⚠️  expense_month constraint may already exist');
      }

      // Add indexes (ignore errors if already exist)
      try {
        await connection.execute('CREATE INDEX idx_expenses_monthly ON expenses(expense_year, expense_month)');
        console.log('✅ Added monthly index');
      } catch (e) {
        console.log('⚠️  Monthly index may already exist');
      }

      try {
        await connection.execute('CREATE INDEX idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id)');
        console.log('✅ Added monthly payer index');
      } catch (e) {
        console.log('⚠️  Monthly payer index may already exist');
      }

    } else {
      console.log('✅ Schema is already up to date');
    }

    // Verify final structure
    const [finalColumns] = await connection.execute('DESCRIBE expenses') as any[];
    console.log('📊 Final table structure:');
    finalColumns.forEach((col: any) => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Show data sample
    const [sampleData] = await connection.execute('SELECT expense_year, expense_month, COUNT(*) as count FROM expenses GROUP BY expense_year, expense_month ORDER BY expense_year, expense_month LIMIT 10') as any[];
    console.log('📈 Sample data by month:');
    sampleData.forEach((row: any) => {
      console.log(`  ${row.expense_year}-${row.expense_month}: ${row.count} expenses`);
    });

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase().catch(console.error);
} 
