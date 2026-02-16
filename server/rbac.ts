
import { storage } from './storage';
import type { RequestHandler } from 'express';
import type { User } from '@shared/schema';

export const FEATURE_RBAC = process.env.FEATURE_RBAC === 'true' || false;

export interface Permission {
  name: string;
  scope: {
    global?: boolean;
    locations?: string[];
  };
}

export interface UserCapabilities {
  user_id: string;
  roles: string[];
  permissions: Permission[];
  tier?: string;
  entitlements: string[];
}

// Permission definitions
interface PermissionDef {
  global?: boolean;
  scoped?: boolean;
}

export const PERMISSIONS: Record<string, PermissionDef> = {
  // Global permissions
  'perks.read': { global: true },
  'perks.write': { global: true },
  'tiers.read': { global: true },
  'tiers.manage': { global: true },

  // Location-scoped permissions
  'inventory.read': { scoped: true },
  'inventory.checkout': { scoped: true },
  'inventory.manage': { scoped: true },
  'members.read': { scoped: true },
  'members.manage': { scoped: true },
};

// Role-to-permission mappings
export const ROLE_PERMISSIONS = {
  'super_admin': [
    'perks.read', 'perks.write', 'tiers.read', 'tiers.manage',
    'inventory.read', 'inventory.checkout', 'inventory.manage',
    'members.read', 'members.manage'
  ],
  'location_manager': [
    'inventory.read', 'inventory.manage', 'inventory.checkout',
    'members.read', 'members.manage'
  ],
  'staff': [
    'inventory.read', 'inventory.checkout'
  ],
  'member': []
};

export async function getUserCapabilities(userId: string): Promise<UserCapabilities> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userRoles = await storage.getUserRoles(userId);
    const userLocations = await storage.getUserLocations(userId);
    const userMembership = await storage.getUserMembership(userId);

    const permissions: Permission[] = [];
    const roles = userRoles.map(r => r.name);

    // Calculate permissions based on roles
    for (const role of roles) {
      const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];

      for (const permName of rolePermissions) {
        const permDef = PERMISSIONS[permName as keyof typeof PERMISSIONS];

        if (permDef?.global || role === 'super_admin') {
          // Global permission or super admin gets global scope
          permissions.push({
            name: permName,
            scope: { global: true }
          });
        } else if (permDef?.scoped) {
          // Scoped permission - use user's locations
          permissions.push({
            name: permName,
            scope: { locations: userLocations.map(l => l.code) }
          });
        }
      }
    }

    // Get tier-based entitlements
    const entitlements: string[] = [];
    if (userMembership?.tier) {
      const tierPerks = await storage.getTierPerks(userMembership.tier);
      entitlements.push(...tierPerks.map(p => p.name));
    }

    return {
      user_id: userId,
      roles,
      permissions,
      tier: userMembership?.tier,
      entitlements
    };
  } catch (error) {
    console.error('Error getting user capabilities:', error);
    // Return minimal capabilities during setup
    return {
      user_id: userId,
      roles: ['member'],
      permissions: [],
      entitlements: []
    };
  }
}

export function hasPermission(
  capabilities: UserCapabilities,
  permissionName: string,
  options: { locationId?: string } = {}
): boolean {
  if (!FEATURE_RBAC) {
    return true; // Feature disabled - allow all
  }

  const permission = capabilities.permissions.find(p => p.name === permissionName);
  if (!permission) {
    return false;
  }

  // Check scope
  if (permission.scope.global) {
    return true;
  }

  if (options.locationId && permission.scope.locations) {
    return permission.scope.locations.includes(options.locationId);
  }

  return !options.locationId; // No location required for this check
}

export function requirePermission(
  permissionName: string,
  options: { locationId?: string } = {}
): RequestHandler {
  return async (req: any, res, next) => {
    if (!FEATURE_RBAC) {
      return next(); // Feature disabled
    }

    try {
      const userId = req.user?.claims?.sub || req.currentUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const capabilities = await getUserCapabilities(userId);

      if (!hasPermission(capabilities, permissionName, options)) {
        return res.status(403).json({
          message: 'Insufficient permissions',
          required: permissionName,
          scope: options.locationId ? `location:${options.locationId}` : 'any'
        });
      }

      req.userCapabilities = capabilities;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}
