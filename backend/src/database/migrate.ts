import { pool } from './connection-mysql';

export async function runMigration(closePool: boolean = false) {
  console.log('🔄 Starting database migration...');
  
  try {
    // Check if custom allocation ratio fields already exist
    const [rows] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'expenses' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('custom_husband_ratio', 'custom_wife_ratio', 'uses_custom_ratio')
    `);
    
    const existingColumns = (rows as any[]).map(row => row.COLUMN_NAME);
    console.log('Existing custom ratio columns:', existingColumns);
    
    // Add custom allocation ratio fields if they don't exist
    if (!existingColumns.includes('custom_husband_ratio')) {
      console.log('Adding custom_husband_ratio column...');
      await pool.execute(`
        ALTER TABLE expenses 
        ADD COLUMN custom_husband_ratio DECIMAL(3,2) NULL 
        CHECK (custom_husband_ratio IS NULL OR (custom_husband_ratio >= 0 AND custom_husband_ratio <= 1))
      `);
    }
    
    if (!existingColumns.includes('custom_wife_ratio')) {
      console.log('Adding custom_wife_ratio column...');
      await pool.execute(`
        ALTER TABLE expenses 
        ADD COLUMN custom_wife_ratio DECIMAL(3,2) NULL 
        CHECK (custom_wife_ratio IS NULL OR (custom_wife_ratio >= 0 AND custom_wife_ratio <= 1))
      `);
    }
    
    if (!existingColumns.includes('uses_custom_ratio')) {
      console.log('Adding uses_custom_ratio column...');
      await pool.execute(`
        ALTER TABLE expenses 
        ADD COLUMN uses_custom_ratio BOOLEAN DEFAULT FALSE
      `);
    }
    
    // Check if year/month fields exist
    const [yearMonthRows] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'expenses' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('expense_year', 'expense_month')
    `);
    
    const existingYearMonthColumns = (yearMonthRows as any[]).map(row => row.COLUMN_NAME);
    
    if (!existingYearMonthColumns.includes('expense_year')) {
      console.log('Adding expense_year column...');
      await pool.execute(`
        ALTER TABLE expenses 
        ADD COLUMN expense_year INT NOT NULL DEFAULT YEAR(NOW())
      `);
    }
    
    if (!existingYearMonthColumns.includes('expense_month')) {
      console.log('Adding expense_month column...');
      await pool.execute(`
        ALTER TABLE expenses 
        ADD COLUMN expense_month INT NOT NULL DEFAULT MONTH(NOW())
      `);
    }
    
    // Update existing records with year/month from created_at
    console.log('Updating existing records with year/month...');
    await pool.execute(`
      UPDATE expenses 
      SET expense_year = YEAR(created_at), 
          expense_month = MONTH(created_at) 
      WHERE expense_year = YEAR(NOW()) AND expense_month = MONTH(NOW())
    `);
    
    // Add constraints (ignore duplicate errors)
    try {
      await pool.execute(`
        ALTER TABLE expenses 
        ADD CONSTRAINT check_expense_year CHECK (expense_year >= 2020 AND expense_year <= 2099)
      `);
      console.log('Added expense_year constraint');
    } catch (error: any) {
      if (error.code !== 'ER_CHECK_CONSTRAINT_DUP_NAME') {
        console.log('Year constraint may already exist:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE expenses 
        ADD CONSTRAINT check_expense_month CHECK (expense_month >= 1 AND expense_month <= 12)
      `);
      console.log('Added expense_month constraint');
    } catch (error: any) {
      if (error.code !== 'ER_CHECK_CONSTRAINT_DUP_NAME') {
        console.log('Month constraint may already exist:', error.message);
      }
    }
    
    try {
      await pool.execute(`
        ALTER TABLE expenses 
        ADD CONSTRAINT check_custom_ratio_consistency CHECK (
          uses_custom_ratio = FALSE OR 
          (custom_husband_ratio IS NOT NULL AND custom_wife_ratio IS NOT NULL AND 
           ABS(custom_husband_ratio + custom_wife_ratio - 1.0) < 0.001)
        )
      `);
      console.log('Added custom ratio consistency constraint');
    } catch (error: any) {
      if (error.code !== 'ER_CHECK_CONSTRAINT_DUP_NAME') {
        console.log('Custom ratio constraint may already exist:', error.message);
      }
    }
    
    // Add indexes
    const indexes = [
      { name: 'idx_expenses_custom_ratio', sql: 'CREATE INDEX idx_expenses_custom_ratio ON expenses(uses_custom_ratio)' }
    ];
    
    for (const index of indexes) {
      try {
        await pool.execute(index.sql);
        console.log(`Added index: ${index.name}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`Index ${index.name} already exists`);
        } else {
          console.error(`Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    // Verify the migration
    const [finalRows] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'expenses' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nFinal expenses table structure:');
    console.table(finalRows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (closePool) {
      await pool.end();
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration(true) // closePool = true for command line execution
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
} 
