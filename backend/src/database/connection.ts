import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DB_PATH = path.join(__dirname, '../../data/splitmate.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error initializing database:', err.message);
    } else {
      console.log('Database schema initialized');
      seedInitialData();
    }
  });
}

function seedInitialData() {
  // Check if default users exist
  db.get("SELECT COUNT(*) as count FROM users", (err, row: any) => {
    if (err) {
      console.error('Error checking users:', err.message);
      return;
    }
    
    if (row.count === 0) {
      // Insert default users
      const defaultUsers = [
        { id: 'husband-001', name: '夫', role: 'husband' },
        { id: 'wife-001', name: '妻', role: 'wife' }
      ];
      
      const insertUser = db.prepare("INSERT INTO users (id, name, role) VALUES (?, ?, ?)");
      defaultUsers.forEach(user => {
        insertUser.run(user.id, user.name, user.role);
      });
      insertUser.finalize();
      
      console.log('Default users created');
    }
    
    // Check if default allocation ratio exists
    db.get("SELECT COUNT(*) as count FROM allocation_ratios", (err, row: any) => {
      if (err) {
        console.error('Error checking allocation ratios:', err.message);
        return;
      }
      
      if (row.count === 0) {
        // Insert default allocation ratio (70% husband, 30% wife)
        db.run(
          "INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio) VALUES (?, ?, ?)",
          ['default-ratio', 0.7, 0.3],
          (err) => {
            if (err) {
              console.error('Error creating default allocation ratio:', err.message);
            } else {
              console.log('Default allocation ratio created (70% husband, 30% wife)');
            }
          }
        );
      }
    });
  });
}

export function closeDatabase() {
  return new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
} 
