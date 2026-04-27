import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDb() {
  return open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });
}

export async function initializeDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      photo_url TEXT,
      supplier_url TEXT,
      price REAL,
      notes TEXT,
      low_stock_limit REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      photo_url TEXT,
      quantity REAL DEFAULT 0,
      supplier_url TEXT,
      price_per_unit REAL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_url TEXT,
      selling_price REAL
    );

    CREATE TABLE IF NOT EXISTS recipe_materials (
      recipe_id INTEGER,
      item_type TEXT, -- 'material' or 'flower'
      item_id INTEGER,
      quantity_needed REAL,
      PRIMARY KEY (recipe_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item_type TEXT,
      item_id INTEGER,
      quantity_change REAL,
      reason TEXT,
      price REAL,
      supplier_name TEXT,
      supplier_url TEXT,
      purchase_unit_type TEXT,
      units_per_purchase REAL,
      usable_unit_type TEXT,
      purchased_quantity REAL,
      total_usable_quantity REAL,
      unit_price REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS material_category_rules (
      category TEXT PRIMARY KEY,
      low_stock_limit REAL NOT NULL DEFAULT 0
    );
  `);
  
  // Safe migration to add columns if they don't exist
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN price REAL'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN supplier_name TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN supplier_url TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN purchase_unit_type TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN units_per_purchase REAL'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN usable_unit_type TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN purchased_quantity REAL'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN total_usable_quantity REAL'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN unit_price REAL'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE stock_history ADD COLUMN notes TEXT'); } catch (e) { /* ignore */ }

  try { await db.exec('ALTER TABLE materials ADD COLUMN name_en TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE materials ADD COLUMN name_ar TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE materials ADD COLUMN supplier_name TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('UPDATE materials SET name_en = name WHERE name_en IS NULL'); } catch (e) { /* ignore */ }

  try { await db.exec('ALTER TABLE flowers ADD COLUMN name_en TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE flowers ADD COLUMN name_ar TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE flowers ADD COLUMN supplier_name TEXT'); } catch (e) { /* ignore */ }
  try { await db.exec('ALTER TABLE flowers ADD COLUMN pipes_needed REAL DEFAULT 0'); } catch (e) { /* ignore */ }
  try { await db.exec('UPDATE flowers SET name_en = name WHERE name_en IS NULL'); } catch (e) { /* ignore */ }

  // Data hygiene for old/stale rows:
  // 1) keep quantities numeric
  // 2) clear stale supplier/price metadata when item has no history and no stock
  try { await db.exec('UPDATE materials SET quantity = 0 WHERE quantity IS NULL'); } catch (e) { /* ignore */ }
  try { await db.exec('UPDATE flowers SET quantity = 0 WHERE quantity IS NULL'); } catch (e) { /* ignore */ }
  try {
    await db.exec(`
      UPDATE materials
      SET price = 0, supplier_name = '', supplier_url = ''
      WHERE id NOT IN (
        SELECT DISTINCT item_id
        FROM stock_history
        WHERE item_type = 'material'
      )
      AND COALESCE(quantity, 0) <= 0
    `);
  } catch (e) { /* ignore */ }

  console.log("Database initialized.");
  return db;
}
