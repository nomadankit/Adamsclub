
import Message from 'better-sqlite3';

const db = new Message('data.sqlite');

try {
    console.log('Migrating database manually...');

    // Check if column exists
    const table = db.pragma('table_info(bookings)');
    const hasColumn = table.some((col: any) => col.name === 'buffer_end_datetime');

    if (!hasColumn) {
        console.log('Adding buffer_end_datetime column...');
        db.prepare('ALTER TABLE bookings ADD COLUMN buffer_end_datetime integer').run();
        console.log('Column added successfully.');
    } else {
        console.log('Column buffer_end_datetime already exists.');
    }

} catch (error) {
    console.error('Migration failed:', error);
}

db.close();
