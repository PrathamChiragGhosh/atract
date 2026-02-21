// Quick script to check if .env file is loading correctly
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

console.log('\n=== Environment Variables Check ===\n');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const frontendUrl = process.env.FRONTEND_URL;

console.log('GOOGLE_CLIENT_ID:', googleClientId ? `✅ ${googleClientId.substring(0, 30)}...` : '❌ NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', googleClientSecret ? '✅ Set (hidden)' : '❌ NOT SET');
console.log('FRONTEND_URL:', frontendUrl || '❌ NOT SET');

console.log('\n=== Status ===\n');

if (googleClientId && googleClientSecret) {
  console.log('✅ Google OAuth credentials are configured correctly!');
  console.log('\nExpected values:');
  console.log('  GOOGLE_CLIENT_ID should start with: 731757029428-riti9k...');
} else {
  console.log('❌ Google OAuth credentials are NOT configured!');
  console.log('\nPlease add to backend/.env file:');
  console.log('GOOGLE_CLIENT_ID=731757029428-riti9kdef1ctk7501rlifjtp5mcbej9e.apps.googleusercontent.com');
  console.log('GOOGLE_CLIENT_SECRET=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');
  console.log('FRONTEND_URL=http://localhost:3000');
}

console.log('\n');

