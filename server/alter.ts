import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');
db.run('ALTER TABLE materials ADD COLUMN supplier_name TEXT DEFAULT ""', () => {
    db.run('ALTER TABLE flowers ADD COLUMN supplier_name TEXT DEFAULT ""', () => {
        db.run('ALTER TABLE stock_history ADD COLUMN supplier_name TEXT DEFAULT ""', () => {
            console.log('done');
        });
    });
});
