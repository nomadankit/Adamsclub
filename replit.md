# Adam's Club Admin Portal - Project Documentation

## Project Overview
Comprehensive admin management portal for Adam's Club (outdoor equipment rental platform) with sections for Gear Management, Perks Management, Locations Management, Tiers Management, Staff Management, and Consumables Management. Dual-tier architecture supporting subscription tiers (standard perks) and loyalty tiers (additional benefits). Location-based inventory organization with role-based access control and credit-based pricing system.

## Architecture

### Dual-Tier System
- **Subscription Tiers** (BASE, PREMIUM, VIP, EMPLOYEE) - Define standard perks for membership levels
- **Loyalty Tiers** - Additional benefits that stack on top of subscription tier perks for loyal members

### Frontend Pages
- **AdminHome.tsx** - Dashboard with 3-column grid cards for main sections (Gear, Consumables, Perks, Tiers, Locations, Staff)
- **AdminGear.tsx** - Rental equipment management (Daily Rate + Return Credit fields)
- **AdminConsumables.tsx** - One-time purchase items (Credit Price field only)
- **AdminPerks.tsx** - Simplified matrix view with inline edit/delete buttons and add buttons at bottom of each tier section
- **AdminTiers.tsx** - Membership tier management with type selector (Subscription or Loyalty)
- **AdminLocations.tsx** - Location/facility management with staff assignments
- **AdminStaff.tsx** - Staff member CRUD operations

### Backend
- **POST /api/tier-perks** - Assign perk to tier
- **DELETE /api/tier-perks** - Remove perk from tier  
- **GET /api/tiers/:tierId/perks** - Get perks for specific tier
- **GET /api/perks-by-tier** - Get all perks grouped by tier with their access levels
- **Basic endpoints** - CRUD for perks, tiers, locations, assets, staff

### Database Schema
- **tiers** - Membership tier definitions with `type` field (subscription | loyalty)
- **tierPerks** - Junction table linking tiers to perks
- **userTierBenefits** - Tracks user tier-perk benefit usage
- **perks** - Perk definitions (name, description, active status)

### Validation & Access Control
- **client/src/lib/perkAccess.ts** - Validation utility for checking tier-based perk access
  - `checkPerkAccess()` - Single perk validation
  - `checkMultiplePerkAccess()` - Multiple perk validation
  - Integration points documented for: booking creation, check-out, check-in flows

## Design Conventions

### Credit Fields
- Whole numbers only (step="1"), no decimals, no dollar signs
- "Daily Rate" = rental cost per day in credits
- "Return Credit" = credits returned when gear is in excellent condition
- "Credit Price" = one-time purchase price for consumables

### UI Design
- All admin pages use 3-column grid layout with gradient backgrounds
- Card-based layouts with consistent spacing (small/medium/large tiers)
- Icons from lucide-react; company logos from react-icons/si
- Colors: purple/pink gradients for main actions, consistent with shadcn/ui tokens

### Icons
- **Gear**: Package icon
- **Consumables**: Cookie icon (with bite taken out - crumbs effect)
- **Perks**: Heart icon
- **Locations**: MapPin icon
- **Staff**: Users icon
- **Tiers**: Crown icon
- **Loyalty**: Zap icon

### Inventory Management
- **AdminGear** - For rental equipment only (has Daily Rate + Return Credit)
- **AdminConsumables** - For one-time purchase items (has Credit Price only)
- Both support location-based inventory tracking
- Inventory quantities managed per location through locationInventory table

### Navigation
- Consumables page accessible via AdminHome cards, not bottom navigation
- All pages accessible through main navigation system
- Uses wouter for client-side routing

## Recent Changes

### Critical Booking Bug Fix (Feb 2026)
- **Server crash fix**: Added process-level `unhandledRejection`/`uncaughtException` handlers and enhanced global error middleware to always return JSON
- **Atomic booking+credits**: Removed duplicate POST /api/bookings route (second handler deducted credits outside transaction). Consolidated into single handler using synchronous `db.transaction()` for better-sqlite3 atomicity
- **Equipment lookup fix**: Client sends hardcoded benefitId (e.g. 'kayak-premium') - handler now resolves to actual DB asset by: direct ID lookup -> type search -> gear fallback -> 404 JSON
- **Client error handling**: Safe JSON parsing in Bookings.tsx mutation (try/catch around response.json(), falls back to text)
- Root cause: credits were deducted via `spendCredits()` BEFORE booking creation; if booking insert failed (FK constraint on non-existent assetId), credits were already gone with no rollback

### Previous Changes (Turn 12)

### Dual-Tier Architecture Implementation
- Added `TierType` enum to schema with SUBSCRIPTION and LOYALTY values
- Updated `tiers` table with `type` field (default: subscription)
- AdminTiers.tsx now includes tier type selector (dropdown)
- Type badges show "Subscription" vs "Loyalty" on each tier card

### AdminPerks Simplification & UI Reorganization
- Removed view mode toggle - kept matrix view only (cleaner UX)
- **Simplified form**: Now only shows when editing a perk
- **Inline edit/delete buttons**: Each perk row has edit and delete buttons
- **Plus button at bottom**: Each table section (subscription/loyalty) has "Add New Perk" button at the bottom
- **Two separate tables**: 
  - Subscription Tiers (purple header) - Shows standard perks per tier
  - Loyalty Tiers (amber header) - Shows additional benefits per tier
- Search/filter controls work across both tables
- Status badge shows Active/Inactive for each perk

## Known Integration Points for Future Implementation

1. **Booking Flow** - Add checkPerkAccess() to validate tier permissions during:
   - Initial booking request
   - Equipment checkout
   - Equipment checkin

2. **Member Pages** - Display tier-specific perks based on membership

3. **Validation** - Implement actual backend calls in perkAccess.ts utility to query /api/tiers/:tierId/perks

## User Preferences
- Credit-based terminology (no dollar signs)
- Clean, modern admin interface with clear section divisions
- Whole numbers for all credit fields
- Cookie icon for consumables (user preference documented)
- Location-based workflow: staff members assigned to locations see location-specific inventory
- Simple, streamlined forms - only show when needed
- Inline edit/delete buttons in matrix view for easy access

## Technology Stack
- Frontend: React, TanStack Query v5, wouter routing, shadcn/ui components
- Backend: Express.js, PostgreSQL with Drizzle ORM
- Auth: Replit Auth integration (login/logout)
- Styling: Tailwind CSS + custom CSS variables for dark mode
- Icons: lucide-react, react-icons
