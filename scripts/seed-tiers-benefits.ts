
import { db } from "../server/db";
import { tiers, perks, tierPerks } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedTiersAndBenefits() {
  console.log("Seeding tiers and benefits...");

  // Clear existing data
  await db.delete(tierPerks);
  await db.delete(perks);
  await db.delete(tiers);

  // Create loyalty tiers (based on subscription tenure)
  const tierData = [
    {
      name: "New Explorer",
      description: "0-6 months membership",
      price: "0.00",
      isActive: true
    },
    {
      name: "Seasoned Adventurer",
      description: "6-12 months membership",
      price: "0.00",
      isActive: true
    },
    {
      name: "Elite Explorer",
      description: "1-2 years membership",
      price: "0.00",
      isActive: true
    },
    {
      name: "Summit Master",
      description: "2+ years membership",
      price: "0.00",
      isActive: true
    }
  ];

  const insertedTiers = await db.insert(tiers).values(tierData).returning();
  console.log(`Created ${insertedTiers.length} tiers`);

  // Create all benefits/perks
  const perkData = [
    // Gear Rentals
    { name: "Kayak Fleet Access", description: "Single & tandem kayaks, paddle boards - Full day rental", isActive: true },
    { name: "Camping Equipment", description: "4-person tents, sleeping bags, camp stoves - 3 day rental", isActive: true },
    { name: "Mountain Bikes", description: "Trail-ready mountain bikes with helmets - Full day rental", isActive: true },
    { name: "Hiking Gear Package", description: "Backpacks, boots, poles, GPS devices - 2 day rental", isActive: true },
    
    // Experiences
    { name: "Guided Adventure Tours", description: "Expert-led expeditions to hidden gems", isActive: true },
    { name: "Photography Workshops", description: "Landscape & wildlife photography sessions", isActive: true },
    { name: "Sunrise Yoga Sessions", description: "Outdoor yoga in scenic locations", isActive: true },
    { name: "Survival Skills Workshop", description: "Learn wilderness survival techniques", isActive: true },
    
    // Premium Locations
    { name: "Private Beach Access", description: "Exclusive access to secluded beaches", isActive: true },
    { name: "Mountain Cabin Retreats", description: "Weekend stays in luxury cabins", isActive: true },
    { name: "Lake House Access", description: "Day passes to lakefront properties", isActive: true },
    { name: "Trail Head Parking", description: "Reserved parking at popular trailheads", isActive: true },
    
    // Services
    { name: "Gear Maintenance", description: "Free cleaning & maintenance of rented gear", isActive: true },
    { name: "Emergency Rescue Service", description: "24/7 emergency assistance coverage", isActive: true },
    { name: "Personal Adventure Guide", description: "One-on-one adventure planning sessions", isActive: true },
    { name: "Gear Storage Service", description: "Store your personal gear at our facilities", isActive: true },
    
    // Rewards
    { name: "Birthday Adventure Credit", description: "Special credit on your birthday month", isActive: true },
    { name: "Referral Bonus Credits", description: "Earn credits for referring friends", isActive: true },
    { name: "Annual Appreciation Gift", description: "Exclusive gear gift each year", isActive: true },
    { name: "Member Milestone Rewards", description: "Special perks at loyalty milestones", isActive: true },
    
    // Social/Events
    { name: "Monthly Member Meetups", description: "Social gatherings with fellow adventurers", isActive: true },
    { name: "Seasonal Group Expeditions", description: "Organized group adventures quarterly", isActive: true },
    { name: "Skills Workshop Series", description: "Learn new outdoor skills monthly", isActive: true },
    { name: "Adventure Film Nights", description: "Outdoor movie screenings & presentations", isActive: true }
  ];

  const insertedPerks = await db.insert(perks).values(perkData).returning();
  console.log(`Created ${insertedPerks.length} perks`);

  // Map perks to tiers (tier-based progression)
  const tierPerkMappings = [
    // New Explorer (0-6 months) - Basic benefits
    { tierName: "New Explorer", perkNames: [
      "Kayak Fleet Access", "Camping Equipment", "Mountain Bikes", "Hiking Gear Package",
      "Gear Maintenance", "Trail Head Parking", "Monthly Member Meetups", "Adventure Film Nights"
    ]},
    
    // Seasoned Adventurer (6-12 months) - Adds experiences
    { tierName: "Seasoned Adventurer", perkNames: [
      "Kayak Fleet Access", "Camping Equipment", "Mountain Bikes", "Hiking Gear Package",
      "Photography Workshops", "Sunrise Yoga Sessions",
      "Gear Maintenance", "Trail Head Parking", "Gear Storage Service",
      "Monthly Member Meetups", "Skills Workshop Series", "Adventure Film Nights",
      "Referral Bonus Credits"
    ]},
    
    // Elite Explorer (1-2 years) - Adds premium locations & services
    { tierName: "Elite Explorer", perkNames: [
      "Kayak Fleet Access", "Camping Equipment", "Mountain Bikes", "Hiking Gear Package",
      "Guided Adventure Tours", "Photography Workshops", "Sunrise Yoga Sessions", "Survival Skills Workshop",
      "Private Beach Access", "Lake House Access", "Trail Head Parking",
      "Gear Maintenance", "Emergency Rescue Service", "Personal Adventure Guide", "Gear Storage Service",
      "Monthly Member Meetups", "Seasonal Group Expeditions", "Skills Workshop Series", "Adventure Film Nights",
      "Birthday Adventure Credit", "Referral Bonus Credits"
    ]},
    
    // Summit Master (2+ years) - All benefits
    { tierName: "Summit Master", perkNames: [
      "Kayak Fleet Access", "Camping Equipment", "Mountain Bikes", "Hiking Gear Package",
      "Guided Adventure Tours", "Photography Workshops", "Sunrise Yoga Sessions", "Survival Skills Workshop",
      "Private Beach Access", "Mountain Cabin Retreats", "Lake House Access", "Trail Head Parking",
      "Gear Maintenance", "Emergency Rescue Service", "Personal Adventure Guide", "Gear Storage Service",
      "Monthly Member Meetups", "Seasonal Group Expeditions", "Skills Workshop Series", "Adventure Film Nights",
      "Birthday Adventure Credit", "Referral Bonus Credits", "Annual Appreciation Gift", "Member Milestone Rewards"
    ]}
  ];

  for (const mapping of tierPerkMappings) {
    const tier = insertedTiers.find(t => t.name === mapping.tierName);
    if (!tier) continue;

    for (const perkName of mapping.perkNames) {
      const perk = insertedPerks.find(p => p.name === perkName);
      if (!perk) continue;

      await db.insert(tierPerks).values({
        tierId: tier.id,
        perkId: perk.id
      });
    }
  }

  console.log("Tier-perk mappings created successfully");
  console.log("✅ Seeding complete!");
}

seedTiersAndBenefits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
