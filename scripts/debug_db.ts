
import { db } from '../server/db';
import { bookings } from '@shared/schema';
import { desc } from 'drizzle-orm';

async function main() {
    console.log('🔍 Debugging DB Content...');
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(5);

    rows.forEach(r => {
        console.log('------------------------------------------------');
        console.log(`ID: ${r.id}`);
        console.log(`Status: ${r.status}`);
        console.log(`AssetID: ${r.assetId}`);
        console.log(`Start: ${r.startDate} (${typeof r.startDate})`);
        console.log(`End:   ${r.endDate} (${typeof r.endDate})`);
        console.log(`Buffer:${r.bufferEnd} (${typeof r.bufferEnd})`);
        // Manually check if bufferEnd is null or invalid
    });
    process.exit(0);
}

main();
