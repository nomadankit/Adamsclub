
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data.sqlite');
console.log(`Open database at ${dbPath}`);

const db = new Database(dbPath);

try {
    console.log("🧹 Clearing demo assets...");

    const stmt = db.prepare('DELETE FROM assets');
    const info = stmt.run();

    console.log(`✅ Deleted ${info.changes} assets.`);
} catch (error) {
    console.error("❌ Error clearing assets:", error);
}
