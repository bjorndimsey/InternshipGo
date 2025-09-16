// Database migration script to convert from single users table to separated tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, 'internshipgo.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.log('Database does not exist. Running initial schema setup...');
  process.exit(0);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to database for migration');
    migrateDatabase();
  }
});

function migrateDatabase() {
  console.log('Starting database migration...');
  
  db.serialize(() => {
    // Check if migration is needed
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='students'", (err, row) => {
      if (err) {
        console.error('Error checking migration status:', err.message);
        return;
      }
      
      if (row) {
        console.log('Migration already completed. Tables exist.');
        db.close();
        return;
      }
      
      console.log('Migration needed. Starting migration process...');
      
      // Start transaction
      db.run('BEGIN TRANSACTION');
      
      // Create new tables
      const createStudentsTable = `
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          id_number VARCHAR(20) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          age INTEGER NOT NULL,
          year VARCHAR(10) NOT NULL,
          date_of_birth DATE NOT NULL,
          program VARCHAR(100) NOT NULL,
          major VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      
      const createCoordinatorsTable = `
        CREATE TABLE IF NOT EXISTS coordinators (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          program VARCHAR(100) NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      
      const createCompaniesTable = `
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          industry VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      
      // Create tables
      db.run(createStudentsTable, (err) => {
        if (err) {
          console.error('Error creating students table:', err.message);
          db.run('ROLLBACK');
          return;
        }
        console.log('Students table created');
      });
      
      db.run(createCoordinatorsTable, (err) => {
        if (err) {
          console.error('Error creating coordinators table:', err.message);
          db.run('ROLLBACK');
          return;
        }
        console.log('Coordinators table created');
      });
      
      db.run(createCompaniesTable, (err) => {
        if (err) {
          console.error('Error creating companies table:', err.message);
          db.run('ROLLBACK');
          return;
        }
        console.log('Companies table created');
      });
      
      // Migrate existing data
      db.all("SELECT * FROM users WHERE user_type = 'Student'", (err, students) => {
        if (err) {
          console.error('Error fetching students:', err.message);
          db.run('ROLLBACK');
          return;
        }
        
        students.forEach(student => {
          if (student.id_number && student.first_name && student.last_name) {
            db.run(`
              INSERT INTO students (user_id, id_number, first_name, last_name, age, year, date_of_birth, program, major, address)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              student.id, student.id_number, student.first_name, student.last_name,
              student.age, student.year, student.date_of_birth, student.program,
              student.major, student.address
            ], (err) => {
              if (err) {
                console.error('Error migrating student:', err.message);
              }
            });
          }
        });
        console.log(`Migrated ${students.length} students`);
      });
      
      db.all("SELECT * FROM users WHERE user_type = 'Coordinator'", (err, coordinators) => {
        if (err) {
          console.error('Error fetching coordinators:', err.message);
          db.run('ROLLBACK');
          return;
        }
        
        coordinators.forEach(coordinator => {
          if (coordinator.first_name && coordinator.last_name) {
            db.run(`
              INSERT INTO coordinators (user_id, first_name, last_name, program, phone_number, address)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              coordinator.id, coordinator.first_name, coordinator.last_name,
              coordinator.program, coordinator.phone_number, coordinator.address
            ], (err) => {
              if (err) {
                console.error('Error migrating coordinator:', err.message);
              }
            });
          }
        });
        console.log(`Migrated ${coordinators.length} coordinators`);
      });
      
      db.all("SELECT * FROM users WHERE user_type = 'Company'", (err, companies) => {
        if (err) {
          console.error('Error fetching companies:', err.message);
          db.run('ROLLBACK');
          return;
        }
        
        companies.forEach(company => {
          if (company.company_name) {
            db.run(`
              INSERT INTO companies (user_id, company_name, industry, address)
              VALUES (?, ?, ?, ?)
            `, [
              company.id, company.company_name, company.industry, company.address
            ], (err) => {
              if (err) {
                console.error('Error migrating company:', err.message);
              }
            });
          }
        });
        console.log(`Migrated ${companies.length} companies`);
        
        // Create indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_students_id_number ON students(id_number)');
        db.run('CREATE INDEX IF NOT EXISTS idx_coordinators_user_id ON coordinators(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name)');
        
        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing migration:', err.message);
          } else {
            console.log('Migration completed successfully!');
          }
          db.close();
        });
      });
    });
  });
}
