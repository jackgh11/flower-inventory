import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bouquets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT DEFAULT '',
      name_ar TEXT DEFAULT '',
      name TEXT,
      photo_url TEXT,
      selling_price REAL DEFAULT 0,
      notes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bouquet_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bouquet_id INTEGER,
      item_type TEXT, -- 'flower' or 'material'
      item_id INTEGER,
      quantity REAL DEFAULT 1,
      pipe_material_id INTEGER -- if item_type is 'flower', this is the specific material used for the pipes
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      date TEXT,
      total_price REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_type TEXT, -- 'bouquet', 'material', or 'flower'
      item_id INTEGER,
      quantity REAL DEFAULT 1,
      price REAL DEFAULT 0
    )
  `, () => {
    console.log('done');
  });
});
