const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

let dbType = 'mysql'; 
let mysqlPool = null;
let sqliteDb = null;

function isReadQuery(sql) {
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return true;
  }
  return false;
}

async function query(sql, params = []) {
  if (dbType === 'mysql') {
    try {
      const [results] = await mysqlPool.query(sql, params);
      if (Array.isArray(results)) {
        return results;
      }
      return {
        insertId: results.insertId,
        affectedRows: results.affectedRows
      };
    } catch (err) {
      console.error('mysql error: ', err);
      throw err;
    }
  } else {
    return new Promise((resolve, reject) => {
      if (isReadQuery(sql)) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) {
            console.error('sqlite read error: ', err);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) {
            console.error('sqlite write error: ', err);
            reject(err);
          } else {
            resolve({
              insertId: this.lastID,
              affectedRows: this.changes
            });
          }
        });
      }
    });
  }
}

function translateToSqlite(sqlContent) {
  return sqlContent
    .replace(/INT AUTO_INCREMENT PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/INT AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
}

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log("running migrations...");

  if (dbType === 'mysql') {
    const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (let i = 0; i < statements.length; i++) {
      await query(statements[i]);
    }
  } else {
    const sqliteSchema = translateToSqlite(schemaSql);
    return new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run('PRAGMA foreign_keys = ON;');
        sqliteDb.exec(sqliteSchema, (err) => {
          if (err) {
            console.error('sqlite migration error: ', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  try {
    const columns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quizzes' AND COLUMN_NAME = 'difficulty'"
    );
    if (columns.length === 0) {
      await query("ALTER TABLE quizzes ADD COLUMN difficulty VARCHAR(50) NOT NULL DEFAULT 'easy'");
      console.log("difficulty column added to quizzes table");
    } else {
      console.log("quizzes table difficulty column already exists");
    }
  } catch (err) {
    console.error("error checking/adding difficulty column:", err);
  }

  console.log("migrations finished");
}

async function seedDatabase() {
  try {
    const users = await query('SELECT COUNT(*) as count FROM users');
    let count = 0;
    if (users && users[0]) {
      if (users[0].count !== undefined) {
        count = Number(users[0].count);
      } else if (users[0]['COUNT(*)'] !== undefined) {
        count = Number(users[0]['COUNT(*)']);
      }
    }
    
    if (count === 0) {
      console.log('seeding users...');
      
      const adminPasswordHash = await bcrypt.hash('adminpassword', 10);
      const userPasswordHash = await bcrypt.hash('userpassword', 10);

      await query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', adminPasswordHash, 'admin']
      );

      await query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['user', userPasswordHash, 'user']
      );
      
      console.log('seeding completed successfully');
    }
  } catch (err) {
    console.error('seeding error: ', err);
  }
}

async function initDb() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = process.env.DB_PORT || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'quiz_db';

  console.log('connecting to database...');

  try {
    const initConnection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    await initConnection.query('CREATE DATABASE IF NOT EXISTS `' + dbName + '`');
    await initConnection.end();

    mysqlPool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    dbType = 'mysql';
    console.log('mysql connection successful');
  } catch (err) {
    console.log('mysql connect failed, using sqlite instead: ' + err.message);

    dbType = 'sqlite';
    const sqlitePath = path.join(__dirname, 'quiz_app.db');
    
    await new Promise((resolve, reject) => {
      sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          console.error('sqlite error: ', err);
          reject(err);
        } else {
          console.log('sqlite db initialized');
          resolve();
        }
      });
    });
  }

  await runMigrations();
  await seedDatabase();
}

module.exports = {
  initDb,
  query,
  getDbType: () => dbType
};
