import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');
db.run('ALTER TABLE flowers ADD COLUMN pipes_needed REAL DEFAULT 0', () => {
    console.log('done');
});
