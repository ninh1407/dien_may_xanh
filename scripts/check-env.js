#!/usr/bin/env node
require('dotenv').config();

// Environment variables validation script
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const optionalEnvVars = [
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MOMO_PARTNER_CODE',
  'MOMO_ACCESS_KEY',
  'MOMO_SECRET_KEY'
];

console.log('🔍 Checking environment variables...\n');

// Check required variables
console.log('📋 Required Environment Variables:');
let hasErrors = false;

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    hasErrors = true;
  }
});

console.log('\n📋 Optional Environment Variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

console.log('\n📊 Summary:');
if (hasErrors) {
  console.log('❌ Environment variables check failed. Please set all required variables.');
  console.log('\n📝 To fix this, you can:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Update .env with your actual values');
  console.log('3. Restart the server');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
  console.log('🚀 Your application should work correctly.');
  process.exit(0);
}