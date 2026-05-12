// server/db/index.js
const Database = require("better-sqlite3");
const path = require("path");

let db;

function initDB() {
  db = new Database(path.join(__dirname, "app.db"));

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS phone_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_type TEXT NOT NULL,
      status_data TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("数据库初始化完成");
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };
