import fs from 'fs';
import path from 'path';
import { Pool, PoolConfig } from 'pg';

// PostgreSQL connection configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Connected to PostgreSQL database');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    const schemaPath = path.join(__dirname, 'postgres-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema creation
    await pool.query(schema);
    console.log('✅ PostgreSQL database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL database schema:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection pool:', error);
  }
}

// Health check for monitoring
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: Date;
}> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    client.release();
    
    return {
      status: 'healthy',
      message: `PostgreSQL connection healthy. Found ${result.rows[0].table_count} tables.`,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date()
    };
  }
}

// Database statistics for monitoring
export async function getDatabaseStats(): Promise<{
  totalTables: number;
  totalConnections: number;
  databaseSize: string;
}> {
  try {
    const client = await pool.connect();
    
    // Get table count
    const tableResult = await client.query(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1',
      ['public']
    );
    
    // Get active connections
    const connectionResult = await client.query(
      'SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = $1',
      ['active']
    );
    
    // Get database size
    const sizeResult = await client.query(
      'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
    );
    
    client.release();
    
    return {
      totalTables: parseInt(tableResult.rows[0].count),
      totalConnections: parseInt(connectionResult.rows[0].count),
      databaseSize: sizeResult.rows[0].size
    };
  } catch (error) {
    console.error('❌ Failed to get database statistics:', error);
    throw error;
  }
} 
