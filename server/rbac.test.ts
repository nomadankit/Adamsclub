
import { getUserCapabilities, hasPermission, FEATURE_RBAC } from './rbac';

// Mock test - in a real app you'd use a proper test framework
async function testRBAC() {
  console.log('🧪 Testing RBAC system...');
  
  try {
    // Enable feature for testing
    process.env.FEATURE_RBAC = 'true';
    
    // Test super admin capabilities
    const adminCapabilities = await getUserCapabilities('test_super_admin');
    console.log('Admin capabilities:', adminCapabilities);
    
    // Test permissions
    const canWritePerks = hasPermission(adminCapabilities, 'perks.write');
    const canManageInventory = hasPermission(adminCapabilities, 'inventory.manage', { locationId: 'A' });
    
    console.log('Admin can write perks:', canWritePerks);
    console.log('Admin can manage inventory at A:', canManageInventory);
    
    // Test staff capabilities
    const staffCapabilities = await getUserCapabilities('test_staff_a');
    console.log('Staff capabilities:', staffCapabilities);
    
    const staffCanWritePerks = hasPermission(staffCapabilities, 'perks.write');
    const staffCanCheckout = hasPermission(staffCapabilities, 'inventory.checkout', { locationId: 'A' });
    const staffCanCheckoutB = hasPermission(staffCapabilities, 'inventory.checkout', { locationId: 'B' });
    
    console.log('Staff can write perks:', staffCanWritePerks);
    console.log('Staff can checkout at A:', staffCanCheckout);
    console.log('Staff can checkout at B:', staffCanCheckoutB);
    
    console.log('✅ RBAC tests completed');
    
  } catch (error) {
    console.error('❌ RBAC test failed:', error);
  }
}

if (require.main === module) {
  testRBAC();
}
