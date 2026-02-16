/**
 * Perk Validation & Access Control Utilities
 * Used for checking tier-based perk eligibility during booking and check-in/check-out
 */

import type { Booking } from "@shared/schema"

interface UserTierInfo {
  tierName: string
  tierPerks: string[]
}

/**
 * Check if a user with a specific tier has access to a perk
 * @param userTier The user's membership tier name
 * @param tierPerksMap Map of tier names to their perks
 * @param perkName Name of the perk to check
 * @returns true if user's tier grants access to the perk
 */
export function canUserAccessPerk(
  userTier: string,
  tierPerksMap: Record<string, string[]>,
  perkName: string
): boolean {
  const tierPerks = tierPerksMap[userTier]
  if (!tierPerks) return false
  return tierPerks.includes(perkName)
}

/**
 * Validate perk access during booking
 * Should be called when a user tries to book an experience/gear with perk benefits
 * @param userTierName The user's membership tier
 * @param tierPerksMap Map of tier names to their accessible perks
 * @param requiredPerks List of perk names required for this booking
 * @returns Error message if validation fails, null if valid
 */
export function validatePerkAccessForBooking(
  userTierName: string,
  tierPerksMap: Record<string, string[]>,
  requiredPerks: string[]
): string | null {
  for (const perk of requiredPerks) {
    if (!canUserAccessPerk(userTierName, tierPerksMap, perk)) {
      return `Your tier (${userTierName}) does not have access to the "${perk}" perk`
    }
  }
  return null
}

/**
 * Validate perk usage during check-in/check-out
 * Ensures the user's tier still has access to perks they're trying to use
 * @param booking The booking record
 * @param userTierName Current user's membership tier
 * @param tierPerksMap Current tier-to-perks mapping
 * @param usedPerks List of perk names being used
 * @param context Either "checkout" or "checkin"
 * @returns Error message if validation fails, null if valid
 */
export function validatePerkUsageDuringCheckInOut(
  booking: Booking,
  userTierName: string,
  tierPerksMap: Record<string, string[]>,
  usedPerks: string[],
  context: "checkout" | "checkin"
): string | null {
  // Verify user still has access to all perks they're trying to use
  for (const perk of usedPerks) {
    if (!canUserAccessPerk(userTierName, tierPerksMap, perk)) {
      return `Cannot ${context} with "${perk}" perk - your tier (${userTierName}) no longer has access`
    }
  }
  return null
}

/**
 * Get available perks for a user's tier
 * Useful for UI to show which perks are available to the user
 * @param userTierName The user's membership tier
 * @param tierPerksMap Map of tier names to their accessible perks
 * @returns Array of perk names available to the user
 */
export function getAvailablePerksForTier(
  userTierName: string,
  tierPerksMap: Record<string, string[]>
): string[] {
  return tierPerksMap[userTierName] || []
}

/**
 * Check if perk upgrades are allowed for a booking
 * Prevents adding perks at checkout that weren't available during booking
 * @param bookingPerks Perks selected at time of booking
 * @param checkoutPerks Perks being selected at checkout
 * @returns Error message if forbidden perks were added, null if valid
 */
export function validatePerkUpgradesAtCheckout(
  bookingPerks: string[],
  checkoutPerks: string[]
): string | null {
  const newPerks = checkoutPerks.filter(p => !bookingPerks.includes(p))
  if (newPerks.length > 0) {
    return `Cannot add new perks at checkout: ${newPerks.join(", ")}`
  }
  return null
}

// ===== INTEGRATION POINTS FOR VALIDATION =====
// These functions should be called from:
//
// 1. BOOKING FLOW (/pages/Booking.tsx):
//    - After user selects tier/membership
//    - When adding perks to booking
//    CALL: validatePerkAccessForBooking()
//
// 2. CHECK-OUT FLOW (/pages/CheckOut.tsx or CheckOutModal):
//    - When staff checks out equipment with perks
//    CALL: validatePerkUsageDuringCheckInOut(..., "checkout")
//
// 3. CHECK-IN FLOW (/pages/CheckIn.tsx or CheckInModal):
//    - When staff checks in equipment with perks
//    CALL: validatePerkUsageDuringCheckInOut(..., "checkin")
//
// 4. PERK SELECTION UI:
//    - When displaying available perks to user
//    CALL: getAvailablePerksForTier()
//
// Example usage in checkout:
// ```
// const tierPerksMap = await fetch('/api/perks-by-tier').then(r => r.json())
// const error = validatePerkUsageDuringCheckInOut(
//   booking,
//   userTierName,
//   tierPerksMap,
//   selectedPerks,
//   'checkout'
// )
// if (error) showError(error)
// ```
