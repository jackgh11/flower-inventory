import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeDb, openDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const AUTH_USERNAME = process.env.APP_USERNAME || 'jack';
const AUTH_PASSWORD = process.env.APP_PASSWORD || 'loraghneim';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const activeTokens = new Map<string, number>();

function getBearerToken(req: express.Request) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

app.use((req, res, next) => {
  const isApi = req.path.startsWith('/api');
  const isAuthRoute = req.path === '/api/auth/login';
  if (!isApi || isAuthRoute) return next();

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const expiry = activeTokens.get(token);
  if (!expiry || expiry < Date.now()) {
    activeTokens.delete(token);
    return res.status(401).json({ success: false, message: 'Session expired' });
  }
  next();
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
  res.json({ success: true, token, username: AUTH_USERNAME });
});

app.get('/api/auth/me', (req, res) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const expiry = activeTokens.get(token);
  if (!expiry || expiry < Date.now()) {
    activeTokens.delete(token);
    return res.status(401).json({ success: false, message: 'Session expired' });
  }
  res.json({ success: true, username: AUTH_USERNAME });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) activeTokens.delete(token);
  res.json({ success: true });
});

async function recomputeItemFromHistory(db: any, itemType: 'material' | 'flower', itemId: number) {
  const allHistory = await db.all(
    'SELECT * FROM stock_history WHERE item_type = ? AND item_id = ? ORDER BY date ASC, id ASC',
    [itemType, itemId]
  );

  const qty = allHistory.reduce((sum: number, h: any) => sum + Number(h.quantity_change || 0), 0);
  const purchases = allHistory.filter((h: any) => Number(h.quantity_change || 0) > 0);
  const totalPurchaseCost = purchases.reduce((sum: number, h: any) => sum + Number(h.price || 0), 0);
  const totalPurchaseQty = purchases.reduce((sum: number, h: any) => sum + Number(h.quantity_change || 0), 0);
  const avgUnitCost = totalPurchaseQty > 0 ? totalPurchaseCost / totalPurchaseQty : 0;
  const latestPurchase = purchases[purchases.length - 1];

  if (itemType === 'material') {
    await db.run(
      'UPDATE materials SET quantity = ?, price = ?, supplier_name = ?, supplier_url = ? WHERE id = ?',
      [
        Math.max(0, Number(qty.toFixed(4))),
        Number(avgUnitCost.toFixed(6)),
        latestPurchase?.supplier_name || '',
        latestPurchase?.supplier_url || '',
        itemId
      ]
    );
  } else {
    await db.run(
      'UPDATE flowers SET quantity = ?, price_per_unit = ?, supplier_name = ?, supplier_url = ? WHERE id = ?',
      [
        Math.max(0, Number(qty.toFixed(4))),
        Number(avgUnitCost.toFixed(6)),
        latestPurchase?.supplier_name || '',
        latestPurchase?.supplier_url || '',
        itemId
      ]
    );
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

app.post('/api/upload', upload.array('images', 10), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) return res.status(400).send('No files uploaded.');
  const urls = (req.files as Express.Multer.File[]).map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

// MATERIALS API
app.get('/api/materials', async (req, res) => {
  const db = await openDb();
  const materials = await db.all('SELECT * FROM materials ORDER BY id DESC');
  res.json(materials);
});

app.get('/api/material-category-rules', async (req, res) => {
  const db = await openDb();
  const rules = await db.all('SELECT * FROM material_category_rules ORDER BY category ASC');
  res.json(rules);
});

app.post('/api/material-category-rules', async (req, res) => {
  const db = await openDb();
  const { category, low_stock_limit } = req.body;
  const normalizedCategory = (category || '').trim();
  const normalizedLimit = Number(low_stock_limit || 0);
  if (!normalizedCategory) {
    return res.status(400).json({ success: false, message: 'Category is required.' });
  }
  await db.run(
    `INSERT INTO material_category_rules (category, low_stock_limit)
     VALUES (?, ?)
     ON CONFLICT(category) DO UPDATE SET low_stock_limit = excluded.low_stock_limit`,
    [normalizedCategory, normalizedLimit]
  );
  res.json({ success: true });
});

app.delete('/api/material-category-rules/:category', async (req, res) => {
  const db = await openDb();
  await db.run('DELETE FROM material_category_rules WHERE category = ?', [decodeURIComponent(req.params.category)]);
  res.json({ success: true });
});

app.post('/api/materials', async (req, res) => {
  const db = await openDb();
  const { name_en, name_ar, category, color, unit, photo_url, supplier_name, supplier_url } = req.body;
  const result = await db.run(
    'INSERT INTO materials (name_en, name_ar, name, category, color, quantity, unit, photo_url, supplier_name, supplier_url, price, notes, low_stock_limit) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, "", 10)',
    [name_en, name_ar, name_en, category, color, unit, photo_url, supplier_name || '', supplier_url || '']
  );
    
  res.json({ id: result.lastID });
});

app.put('/api/materials/:id', async (req, res) => {
  const db = await openDb();
  const { name_en, name_ar, category, color, unit, photo_url, supplier_name, supplier_url } = req.body;
  await db.run(
    'UPDATE materials SET name_en = ?, name_ar = ?, category = ?, color = ?, unit = ?, photo_url = ?, supplier_name = ?, supplier_url = ? WHERE id = ?',
    [name_en, name_ar, category, color, unit, photo_url, supplier_name || '', supplier_url || '', req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/materials/:id', async (req, res) => {
  const db = await openDb();
  await db.run('DELETE FROM materials WHERE id = ?', [req.params.id]);
  await db.run('DELETE FROM stock_history WHERE item_type = "material" AND item_id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/materials/:id/restock', async (req, res) => {
  const db = await openDb();
  const {
    quantity,
    unit_price,
    total_price,
    supplier_name,
    supplier_url,
    color,
    purchase_unit_type,
    purchased_quantity,
    units_per_purchase,
    usable_unit_type,
    notes
  } = req.body;
  const id = req.params.id;

  const material = await db.get('SELECT * FROM materials WHERE id = ?', [id]);
  if (!material) {
    return res.status(404).json({ success: false, message: 'Material not found' });
  }

  // Backward compatible fallback: old payload can still send `quantity` + `unit_price`.
  const resolvedPurchasedQuantity = Number(purchased_quantity ?? quantity ?? 0);
  const resolvedUnitsPerPurchase = Number(units_per_purchase ?? 1);
  const totalUsableQuantity = Number((resolvedPurchasedQuantity * resolvedUnitsPerPurchase).toFixed(4));
  const resolvedTotalPrice = Number(total_price ?? (unit_price || 0) * totalUsableQuantity);
  const incomingUnitPrice = totalUsableQuantity > 0 ? Number((resolvedTotalPrice / totalUsableQuantity).toFixed(6)) : 0;

  if (totalUsableQuantity <= 0 || resolvedTotalPrice < 0) {
    return res.status(400).json({ success: false, message: 'Invalid restock values' });
  }

  const prevQty = Number(material.quantity || 0);
  const prevAvg = Number(material.price || 0);
  const newQty = prevQty + totalUsableQuantity;
  const newAvg = newQty > 0 ? Number((((prevQty * prevAvg) + (totalUsableQuantity * incomingUnitPrice)) / newQty).toFixed(6)) : 0;

  if (color) {
    await db.run(
      'UPDATE materials SET quantity = ?, price = ?, supplier_name = ?, supplier_url = ?, color = ?, unit = ? WHERE id = ?',
      [newQty, newAvg, supplier_name || '', supplier_url || '', color, usable_unit_type || material.unit, id]
    );
  } else {
    await db.run(
      'UPDATE materials SET quantity = ?, price = ?, supplier_name = ?, supplier_url = ?, unit = ? WHERE id = ?',
      [newQty, newAvg, supplier_name || '', supplier_url || '', usable_unit_type || material.unit, id]
    );
  }

  await db.run(
    `INSERT INTO stock_history
      (date, item_type, item_id, quantity_change, reason, price, supplier_name, supplier_url, purchase_unit_type, units_per_purchase, usable_unit_type, purchased_quantity, total_usable_quantity, unit_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      'material',
      id,
      totalUsableQuantity,
      color ? `Purchased Restock (${color})` : 'Purchased Restock',
      resolvedTotalPrice,
      supplier_name || '',
      supplier_url || '',
      purchase_unit_type || material.unit || 'unit',
      resolvedUnitsPerPurchase,
      usable_unit_type || material.unit || 'unit',
      resolvedPurchasedQuantity,
      totalUsableQuantity,
      incomingUnitPrice,
      notes || ''
    ]
  );

  res.json({
    success: true,
    total_usable_quantity: totalUsableQuantity,
    unit_price: incomingUnitPrice,
    updated_stock_quantity: newQty,
    updated_avg_cost_per_unit: newAvg
  });
});

app.get('/api/materials/:id/history', async (req, res) => {
  const db = await openDb();
  const history = await db.all('SELECT * FROM stock_history WHERE item_type = "material" AND item_id = ? ORDER BY id DESC', [req.params.id]);
  res.json(history);
});

app.get('/api/history', async (req, res) => {
  const db = await openDb();
  const history = await db.all('SELECT * FROM stock_history ORDER BY id DESC');
  res.json(history);
});

// FLOWERS API
app.get('/api/flowers', async (req, res) => {
  const db = await openDb();
  const flowers = await db.all('SELECT * FROM flowers ORDER BY id DESC');
  res.json(flowers);
});

app.post('/api/flowers', async (req, res) => {
  const db = await openDb();
  const { type, name_en, name_ar, color, photo_url, supplier_name, supplier_url, pipes_needed } = req.body;
  const result = await db.run(
    'INSERT INTO flowers (type, name_en, name_ar, name, color, photo_url, quantity, supplier_name, supplier_url, price_per_unit, pipes_needed) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?)',
    [type, name_en, name_ar, name_en, color, photo_url, supplier_name || '', supplier_url || '', pipes_needed || 0]
  );
    
  res.json({ id: result.lastID });
});

app.put('/api/flowers/:id', async (req, res) => {
  const db = await openDb();
  const { type, name_en, name_ar, color, photo_url, supplier_name, supplier_url, pipes_needed } = req.body;
  await db.run(
    'UPDATE flowers SET type = ?, name_en = ?, name_ar = ?, color = ?, photo_url = ?, supplier_name = ?, supplier_url = ?, pipes_needed = ? WHERE id = ?',
    [type, name_en, name_ar, color, photo_url, supplier_name || '', supplier_url || '', pipes_needed || 0, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/flowers/:id', async (req, res) => {
  const db = await openDb();
  await db.run('DELETE FROM flowers WHERE id = ?', [req.params.id]);
  await db.run('DELETE FROM stock_history WHERE item_type = "flower" AND item_id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/flowers/:id/restock', async (req, res) => {
  const db = await openDb();
  const { quantity, unit_price, total_price, supplier_name, supplier_url, color } = req.body;
  const id = req.params.id;
  
  if (color) {
    await db.run('UPDATE flowers SET quantity = quantity + ?, price_per_unit = ?, supplier_name = ?, supplier_url = ?, color = ? WHERE id = ?', 
      [quantity, unit_price, supplier_name || '', supplier_url || '', color, id]);
  } else {
    await db.run('UPDATE flowers SET quantity = quantity + ?, price_per_unit = ?, supplier_name = ?, supplier_url = ? WHERE id = ?', 
      [quantity, unit_price, supplier_name || '', supplier_url || '', id]);
  }
    
  await db.run('INSERT INTO stock_history (date, item_type, item_id, quantity_change, reason, price, supplier_name, supplier_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [new Date().toISOString(), 'flower', id, quantity, color ? `Purchased Restock (${color})` : 'Purchased Restock', total_price, supplier_name || '', supplier_url || '']);
    
  res.json({ success: true });
});

app.get('/api/flowers/:id/history', async (req, res) => {
  const db = await openDb();
  const history = await db.all('SELECT * FROM stock_history WHERE item_type = "flower" AND item_id = ? ORDER BY id DESC', [req.params.id]);
  res.json(history);
});

app.delete('/api/history/:id', async (req, res) => {
  const db = await openDb();
  const row = await db.get('SELECT * FROM stock_history WHERE id = ?', [req.params.id]);
  if (row) {
    await db.run('DELETE FROM stock_history WHERE id = ?', [req.params.id]);
    if (row.item_type === 'material' || row.item_type === 'flower') {
      await recomputeItemFromHistory(db, row.item_type, Number(row.item_id));
    }
  }
  res.json({ success: true });
});

app.put('/api/history/:id', async (req, res) => {
  const db = await openDb();
  const {
    purchased_quantity,
    purchase_unit_type,
    units_per_purchase,
    usable_unit_type,
    price,
    supplier_name,
    supplier_url,
    notes
  } = req.body;
  const row = await db.get('SELECT * FROM stock_history WHERE id = ?', [req.params.id]);
  if (row) {
    if (Number(row.quantity_change || 0) <= 0) {
      return res.status(400).json({ success: false, message: 'Only purchase history rows can be edited.' });
    }

    const resolvedPurchasedQty = Number(purchased_quantity ?? row.purchased_quantity ?? row.quantity_change ?? 0);
    const resolvedUnitsPerPurchase = Number(units_per_purchase ?? row.units_per_purchase ?? 1);
    const resolvedTotalUsableQty = Number((resolvedPurchasedQty * resolvedUnitsPerPurchase).toFixed(4));
    const resolvedPrice = Number(price ?? row.price ?? 0);
    const resolvedUnitPrice = resolvedTotalUsableQty > 0 ? Number((resolvedPrice / resolvedTotalUsableQty).toFixed(6)) : 0;

    if (resolvedPurchasedQty <= 0 || resolvedUnitsPerPurchase <= 0 || resolvedPrice < 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase edit values.' });
    }

    await db.run(
      `UPDATE stock_history
       SET quantity_change = ?, purchased_quantity = ?, purchase_unit_type = ?, units_per_purchase = ?, usable_unit_type = ?,
           total_usable_quantity = ?, price = ?, unit_price = ?, supplier_name = ?, supplier_url = ?, notes = ?
       WHERE id = ?`,
      [
        resolvedTotalUsableQty,
        resolvedPurchasedQty,
        purchase_unit_type ?? row.purchase_unit_type ?? 'unit',
        resolvedUnitsPerPurchase,
        usable_unit_type ?? row.usable_unit_type ?? 'unit',
        resolvedTotalUsableQty,
        resolvedPrice,
        resolvedUnitPrice,
        supplier_name ?? row.supplier_name ?? '',
        supplier_url ?? row.supplier_url ?? '',
        notes ?? row.notes ?? '',
        req.params.id
      ]
    );

    if (row.item_type === 'material' || row.item_type === 'flower') {
      await recomputeItemFromHistory(db, row.item_type, Number(row.item_id));
    }
  }
  res.json({ success: true });
});

// BOUQUETS API
app.get('/api/bouquets', async (req, res) => {
  const db = await openDb();
  const bouquets = await db.all('SELECT * FROM bouquets ORDER BY id DESC');
  for (let b of bouquets) {
    b.items = await db.all('SELECT * FROM bouquet_items WHERE bouquet_id = ?', [b.id]);
  }
  res.json(bouquets);
});

app.post('/api/bouquets', async (req, res) => {
  const db = await openDb();
  const { name_en, name_ar, name, photo_url, selling_price, notes, items } = req.body;
  
  const result = await db.run(
    'INSERT INTO bouquets (name_en, name_ar, name, photo_url, selling_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [name_en, name_ar, name, photo_url, selling_price, notes]
  );
  
  const bouquetId = result.lastID;
  if (items && items.length > 0) {
    for (const item of items) {
      await db.run(
        'INSERT INTO bouquet_items (bouquet_id, item_type, item_id, quantity, pipe_material_id) VALUES (?, ?, ?, ?, ?)',
        [bouquetId, item.item_type, item.item_id, item.quantity, item.pipe_material_id || null]
      );
    }
  }
  
  res.json({ id: bouquetId });
});

app.delete('/api/bouquets/:id', async (req, res) => {
  const db = await openDb();
  await db.run('DELETE FROM bouquets WHERE id = ?', [req.params.id]);
  await db.run('DELETE FROM bouquet_items WHERE bouquet_id = ?', [req.params.id]);
  res.json({ success: true });
});

// ORDERS API
app.get('/api/orders', async (req, res) => {
  const db = await openDb();
  const orders = await db.all('SELECT * FROM orders ORDER BY id DESC');
  for (let o of orders) {
    o.items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
  }
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const db = await openDb();
  const { customer_name, total_price, items } = req.body;
  
  const result = await db.run(
    'INSERT INTO orders (customer_name, date, total_price, status) VALUES (?, ?, ?, "Completed")',
    [customer_name, new Date().toISOString(), total_price]
  );
  
  const orderId = result.lastID;
  
  // Process the items and deduct inventory
  if (items && items.length > 0) {
    for (const item of items) {
      await db.run(
        'INSERT INTO order_items (order_id, item_type, item_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.item_type, item.item_id, item.quantity, item.price]
      );
      
      // Stock Deduction Logic
      if (item.item_type === 'material') {
        await db.run('UPDATE materials SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.item_id]);
        await db.run('INSERT INTO stock_history (date, item_type, item_id, quantity_change, reason, price) VALUES (?, ?, ?, ?, ?, ?)', 
          [new Date().toISOString(), 'material', item.item_id, -item.quantity, `Sold in Order #${orderId}`, 0]);
      } else if (item.item_type === 'flower') {
        await db.run('UPDATE flowers SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.item_id]);
        await db.run('INSERT INTO stock_history (date, item_type, item_id, quantity_change, reason, price) VALUES (?, ?, ?, ?, ?, ?)', 
          [new Date().toISOString(), 'flower', item.item_id, -item.quantity, `Sold in Order #${orderId}`, 0]);
      } else if (item.item_type === 'bouquet') {
        // A bouquet consumes its configured items!
        const b_items = await db.all('SELECT * FROM bouquet_items WHERE bouquet_id = ?', [item.item_id]);
        for (const bi of b_items) {
          const totalQtyNeeded = bi.quantity * item.quantity; // sub-recipe quantity * order quantity
          
          if (bi.item_type === 'material') {
            await db.run('UPDATE materials SET quantity = quantity - ? WHERE id = ?', [totalQtyNeeded, bi.item_id]);
            await db.run('INSERT INTO stock_history (date, item_type, item_id, quantity_change, reason, price) VALUES (?, ?, ?, ?, ?, ?)', 
              [new Date().toISOString(), 'material', bi.item_id, -totalQtyNeeded, `Bouquet Material in Order #${orderId}`, 0]);
          } else if (bi.item_type === 'flower') {
            // Wait, does the Bouquet deduct the "Flower Stock" (if pre-crafted) or does it construct the flower from pipes?
            // User requested: "when i put the order it automatically decrease from the stock [pipes]".
            // So we fetch the flower to know how many pipes it needs.
            const f = await db.get('SELECT * FROM flowers WHERE id = ?', [bi.item_id]);
            if (f) {
              const pipesNeededTotal = (f.pipes_needed || 0) * totalQtyNeeded;
              if (pipesNeededTotal > 0 && bi.pipe_material_id) {
                await db.run('UPDATE materials SET quantity = quantity - ? WHERE id = ?', [pipesNeededTotal, bi.pipe_material_id]);
                await db.run('INSERT INTO stock_history (date, item_type, item_id, quantity_change, reason, price) VALUES (?, ?, ?, ?, ?, ?)', 
                  [new Date().toISOString(), 'material', bi.pipe_material_id, -pipesNeededTotal, `Pipes for ${f.name_en || f.name} in Bouquet Order #${orderId}`, 0]);
              }
            }
          }
        }
      }
    }
  }
  
  res.json({ id: orderId, success: true });
});


// DASHBOARD STATS
app.get('/api/dashboard', async (req, res) => {
  const db = await openDb();
  const materialsCount = await db.get('SELECT COUNT(*) as count FROM materials');
  const flowersCount = await db.get('SELECT COUNT(*) as count FROM flowers');
  const lowMaterials = await db.all(`
    SELECT 
      m.*,
      COALESCE(r.low_stock_limit, m.low_stock_limit, 0) as effective_low_stock_limit
    FROM materials m
    LEFT JOIN material_category_rules r ON r.category = m.category
    WHERE m.quantity <= COALESCE(r.low_stock_limit, m.low_stock_limit, 0)
  `);
  const lowByCategory = await db.all(`
    SELECT
      m.category,
      COUNT(*) as low_count
    FROM materials m
    LEFT JOIN material_category_rules r ON r.category = m.category
    WHERE m.quantity <= COALESCE(r.low_stock_limit, m.low_stock_limit, 0)
    GROUP BY m.category
    ORDER BY low_count DESC
  `);
  const multiSupplierItems = await db.all(`
    SELECT
      sh.item_id,
      COUNT(DISTINCT LOWER(TRIM(COALESCE(sh.supplier_name, '')))) as supplier_count
    FROM stock_history sh
    WHERE sh.item_type = 'material'
      AND sh.quantity_change > 0
      AND TRIM(COALESCE(sh.supplier_name, '')) != ''
    GROUP BY sh.item_id
    HAVING COUNT(DISTINCT LOWER(TRIM(COALESCE(sh.supplier_name, '')))) > 1
  `);
  const supplierCountMap = Object.fromEntries(
    multiSupplierItems.map((r: any) => [Number(r.item_id), Number(r.supplier_count)])
  );
  const lowMaterialsWithSuppliers = lowMaterials.map((m: any) => ({
    ...m,
    supplier_count: supplierCountMap[Number(m.id)] || (m.supplier_name ? 1 : 0)
  }));
  const totalMaterialValue = await db.get('SELECT SUM(quantity * price) as value FROM materials');
  const totalFlowerValue = await db.get('SELECT SUM(quantity * price_per_unit) as value FROM flowers');
  const recentHistory = await db.all('SELECT * FROM stock_history ORDER BY id DESC LIMIT 5');

  res.json({
    totalMaterials: materialsCount.count,
    totalFlowers: flowersCount.count,
    lowStockMaterials: lowMaterialsWithSuppliers,
    lowStockByCategory: lowByCategory,
    multiSupplierMaterialCount: multiSupplierItems.length,
    totalInventoryValue: (totalMaterialValue.value || 0) + (totalFlowerValue.value || 0),
    recentHistory
  });
});

const PORT = 3000;
initializeDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
