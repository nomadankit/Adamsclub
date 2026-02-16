
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data.sqlite');
console.log(`Open database at ${dbPath}`);

const db = new Database(dbPath);

try {
    console.log("🧹 Clearing demo assets...");
    // Assuming we want to clear ALL assets as per user request to start fresh
    // or maybe filter by some criteria. The user said "Remove the demo data... shows 6 equipments".
    // If we delete all, we ensure "0 equipments".

    const stmt = db.prepare('DELETE FROM assets');
    const info = stmt.run();

    console.log(`✅ Deleted ${info.changes} assets.`);
} catch (error) {
    console.error("❌ Error clearing assets:", error);
}
