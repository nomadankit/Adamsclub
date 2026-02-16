/**
 * Seeds assets into the local SQLite database
 */

import Database from "better-sqlite3";

const sqlite = new Database("data.sqlite");

const assetData = [
    {
        id: 'kayak-premium',
        name: 'Premium Kayak',
        description: 'Single or tandem kayak rental',
        type: 'gear',
        category: 'water-sports',
        brand: 'Wilderness Systems',
        model: 'Pungo 120',
        condition: 'excellent',
        dailyRate: '45.00',
        depositAmount: '100.00',
        creditPrice: '40.00',
        capacity: 2,
        isAvailable: 1,
        location: 'Lake Marina Dock A',
        tags: JSON.stringify(['kayak', 'water', 'adventure', 'tandem']),
    },
    {
        id: 'camping-kit',
        name: 'Camping Equipment Kit',
        description: '4-person tent, sleeping bags, camping gear',
        type: 'gear',
        category: 'camping',
        brand: 'REI',
        model: 'Base Camp 4',
        condition: 'excellent',
        dailyRate: '75.00',
        depositAmount: '200.00',
        creditPrice: '65.00',
        capacity: 4,
        isAvailable: 1,
        location: 'Equipment Center',
        tags: JSON.stringify(['camping', 'tent', 'outdoor', 'family']),
    },
    {
        id: 'mountain-bike',
        name: 'Mountain Bike',
        description: 'Trail-ready mountain bike rental',
        type: 'gear',
        category: 'cycling',
        brand: 'Trek',
        model: 'Marlin 7',
        condition: 'excellent',
        dailyRate: '50.00',
        depositAmount: '150.00',
        creditPrice: '45.00',
        capacity: 1,
        isAvailable: 1,
        location: 'Equipment Center',
        tags: JSON.stringify(['bike', 'mountain', 'trail', 'cycling']),
    },
    {
        id: 'hiking-gear',
        name: 'Hiking Gear Package',
        description: 'Backpack, boots, poles, navigation',
        type: 'gear',
        category: 'hiking',
        brand: 'Osprey',
        model: 'Atmos AG 65',
        condition: 'excellent',
        dailyRate: '35.00',
        depositAmount: '100.00',
        creditPrice: '30.00',
        capacity: 1,
        isAvailable: 1,
        location: 'Trailhead Station',
        tags: JSON.stringify(['hiking', 'backpack', 'trail', 'outdoor']),
    },
    {
        id: 'bike-rental',
        name: 'Comfort Bike',
        description: 'Casual riding bike for trails and paths',
        type: 'gear',
        category: 'cycling',
        brand: 'Schwinn',
        model: 'Discover',
        condition: 'excellent',
        dailyRate: '30.00',
        depositAmount: '75.00',
        creditPrice: '25.00',
        capacity: 1,
        isAvailable: 1,
        location: 'Equipment Center',
        tags: JSON.stringify(['bike', 'casual', 'trail', 'comfort']),
    },
    {
        id: 'guided-hike',
        name: 'Guided Mountain Hike',
        description: 'Expert-led hiking experience with gear included',
        type: 'experience',
        category: 'hiking',
        condition: 'excellent',
        dailyRate: '120.00',
        creditPrice: '100.00',
        capacity: 8,
        isAvailable: 1,
        location: 'Trailhead Station',
        tags: JSON.stringify(['hiking', 'guided', 'experience', 'adventure']),
    },
];

console.log('Seeding assets to SQLite database...');

const insertStmt = sqlite.prepare(`
  INSERT OR REPLACE INTO assets (
    id, name, description, type, category, brand, model, condition,
    daily_rate, deposit_amount, credit_price, capacity, is_available, location, tags,
    created_at, updated_at
  ) VALUES (
    @id, @name, @description, @type, @category, @brand, @model, @condition,
    @dailyRate, @depositAmount, @creditPrice, @capacity, @isAvailable, @location, @tags,
    unixepoch(), unixepoch()
  )
`);

try {
    for (const asset of assetData) {
        insertStmt.run({
            id: asset.id,
            name: asset.name,
            description: asset.description,
            type: asset.type,
            category: asset.category,
            brand: asset.brand || null,
            model: asset.model || null,
            condition: asset.condition,
            dailyRate: asset.dailyRate,
            depositAmount: asset.depositAmount || null,
            creditPrice: asset.creditPrice,
            capacity: asset.capacity,
            isAvailable: asset.isAvailable,
            location: asset.location,
            tags: asset.tags,
        });
    }
    console.log('✅ Assets seeded successfully to SQLite!');

    // Verify the insert
    const count = sqlite.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number };
    console.log(`Total assets in database: ${count.count}`);
} catch (error) {
    console.error('Error seeding assets:', error);
    process.exit(1);
}

sqlite.close();
