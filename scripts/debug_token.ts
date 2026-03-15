import { db } from '../server/db';

async function debug() {
    const txs = await db.query.tokenTransactions.findMany();
    console.log('Total Txs:', txs.length);
    if (txs.length > 0) {
        console.log('Last Tx:', txs[txs.length - 1]);
    }

    const bookingsList = await db.query.bookings.findMany();
    const latestBooking = bookingsList[bookingsList.length - 1];
    console.log('Latest Booking Status:', latestBooking?.status, latestBooking?.conditionStatus);

    const users = await db.query.users.findMany();
    const demoUser = users.find(u => u.email === 'demo_user@test.com');
    console.log('Demo User Metadata:', demoUser?.metadata);

    const asset = await db.query.assets.findFirst({ where: (a, { eq }) => eq(a.id, latestBooking.assetId) });
    console.log('Asset ExcellentTokenReward:', asset?.excellentTokenReward);

    process.exit(0);
}

debug();
