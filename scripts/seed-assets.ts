

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_4yAwfXv7jUWV@ep-sparkling-thunder-af8zh6rs.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require";
}

async function seedAssets() {
  const { db } = await import('../server/db');
  const { assets } = await import('../shared/schema');

  console.log('Seeding assets...');

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
      isAvailable: true,
      location: 'Lake Marina Dock A',
      tags: ['kayak', 'water', 'adventure', 'tandem'],
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
      isAvailable: true,
      location: 'Equipment Center',
      tags: ['camping', 'tent', 'outdoor', 'family'],
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
      isAvailable: true,
      location: 'Equipment Center',
      tags: ['bike', 'mountain', 'trail', 'cycling'],
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
      isAvailable: true,
      location: 'Trailhead Station',
      tags: ['hiking', 'backpack', 'trail', 'outdoor'],
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
      isAvailable: true,
      location: 'Equipment Center',
      tags: ['bike', 'casual', 'trail', 'comfort'],
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
      isAvailable: true,
      location: 'Trailhead Station',
      tags: ['hiking', 'guided', 'experience', 'adventure'],
    },
  ];

  try {
    for (const asset of assetData) {
      await db.insert(assets).values(asset as any).onConflictDoNothing();
    }
    console.log('✅ Assets seeded successfully!');
  } catch (error) {
    console.error('Error seeding assets:', error);
    throw error;
  }
}

seedAssets()
  .then(() => {
    console.log('Seeding complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
