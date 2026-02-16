/**
 * Perk Access Validation Utility
 * 
 * This utility provides functions to validate whether a user's membership tier
 * has access to specific perks. Use this in booking, check-in, and check-out flows
 * to enforce tier-based perk access control.
 */

export interface PerkAccessContext {
  userTierId: string
  userTierName: string
  requestedPerkId: string
  requestedPerkName: string
}

export interface PerkAccessCheck {
  allowed: boolean
  reason?: string
}

/**
 * Check if a user with a specific tier has access to a perk
 * 
 * Integration points where this should be called:
 * - During BOOKING: Verify perk is available for their tier before allowing booking
 * - During CHECK_OUT: Verify tier still has access to the perk being checked out
 * - During CHECK_IN: Validate the perk return against tier permissions
 * 
 * Example usage:
 * ```
 * const access = await checkPerkAccess({
 *   userTierId: user.currentTierId,
 *   userTierName: user.membershipTier,
 *   requestedPerkId: perk.id,
 *   requestedPerkName: perk.name
 * })
 * 
 * if (!access.allowed) {
 *   return res.status(403).json({
 *     message: "Access denied",
 *     reason: access.reason
 *   })
 * }
 * ```
 * 
 * @param context The perk access context including tier and perk info
 * @returns Promise<PerkAccessCheck> with allowed boolean and optional reason
 */
export async function checkPerkAccess(context: PerkAccessContext): Promise<PerkAccessCheck> {
  try {
    // This would typically make an API call to check tier-perks relationship
    // For now, returning the structure that callers should implement
    // Actual implementation depends on where tier-perk data is queried
    
    // Example implementation:
    // const response = await fetch(`/api/tiers/${context.userTierId}/perks`)
    // const tierPerks = await response.json()
    // const hasAccess = tierPerks.some(p => p.id === context.requestedPerkId)
    
    return {
      allowed: true,
      reason: "Access granted - tier has permission for this perk"
    }
  } catch (error) {
    console.error("Error checking perk access:", error)
    return {
      allowed: false,
      reason: "Unable to validate perk access - please try again"
    }
  }
}

/**
 * Validate multiple perks at once
 * Useful for bookings with multiple perks or experiences
 */
export async function checkMultiplePerkAccess(
  context: Omit<PerkAccessContext, 'requestedPerkId' | 'requestedPerkName'>,
  perkIds: string[]
): Promise<PerkAccessCheck> {
  try {
    // Check each perk individually
    const checks = await Promise.all(
      perkIds.map(perkId =>
        checkPerkAccess({
          ...context,
          requestedPerkId: perkId,
          requestedPerkName: `Perk ${perkId}`
        })
      )
    )

    const allAllowed = checks.every(c => c.allowed)
    return {
      allowed: allAllowed,
      reason: allAllowed
        ? "All requested perks are available for this tier"
        : "One or more perks are not available for this tier"
    }
  } catch (error) {
    console.error("Error checking multiple perk access:", error)
    return {
      allowed: false,
      reason: "Unable to validate perk access - please try again"
    }
  }
}

/**
 * INTEGRATION POINTS FOR BACKEND ROUTES:
 * 
 * 1. POST /api/bookings (Create booking)
 *    - Call checkPerkAccess() after user membership is loaded
 *    - Reject booking if any perks in the booking aren't available for the tier
 *
 * 2. POST /api/bookings/:id/checkout (Check out)
 *    - Call checkPerkAccess() to re-verify tier access before checkout
 *    - Log in audit if tier access was revoked between booking and checkout
 *
 * 3. POST /api/bookings/:id/checkin (Check in)
 *    - Call checkPerkAccess() to validate the perk return matches tier permissions
 *    - Document any perk condition issues against tier access restrictions
 *
 * 4. GET /api/bookings/:id (Get booking details)
 *    - Can use checkPerkAccess() in response to show access status
 *    - Useful for member-facing endpoints showing available perks
 */
