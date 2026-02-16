
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Setting up RBAC system...');

// Set feature flag
process.env.FEATURE_RBAC = 'true';

// Run the migration
const migrationScript = path.join(__dirname, '../server/migrate-rbac.ts');

const child = spawn('npx', ['tsx', migrationScript], {
  stdio: 'inherit',
  env: { ...process.env, FEATURE_RBAC: 'true' }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ RBAC setup completed successfully!');
    console.log('');
    console.log('To enable RBAC, set environment variable:');
    console.log('FEATURE_RBAC=true');
    console.log('');
    console.log('Test users created:');
    console.log('- admin@adamsclub.com (super_admin)');
    console.log('- manager_a@adamsclub.com (location_manager for location A)');
    console.log('- staff_a@adamsclub.com (staff for location A)');
    console.log('- member@adamsclub.com (regular member)');
  } else {
    console.error('❌ RBAC setup failed');
    process.exit(1);
  }
});
