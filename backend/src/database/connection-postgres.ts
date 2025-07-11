import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// Function to seed initial data if the database is empty
export async function seedInitialData() {
  try {
    // Check if users table has any data
    const userResult = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(userResult.rows[0].count);
    
    if (userCount === 0) {
      console.log('Database is empty. Seeding initial data...');
      
      // Insert initial users
      await pool.query(`
        INSERT INTO users (id, name, role) VALUES 
        ('husband', '夫', 'husband'),
        ('wife', '妻', 'wife')
      `);
      
      // Insert default allocation ratio
      await pool.query(`
        INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio) VALUES 
        ('default', 0.50, 0.50)
      `);
      
      console.log('Initial data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

export default pool; 
