import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Read and parse the service account file
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const uid = process.argv[2]; // Get the UID from command line arguments
if (!uid) {
    console.error('❌ Please provide a UID as a command-line argument.');
    console.log('👉 Example: npx ts-node admin-scripts/setAdminClaim.ts YOUR_UID_HERE');
    process.exit(1);
  }

initializeApp({
  credential: cert(serviceAccount as any),
});

const auth = getAuth();

auth.setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Success! ${uid} is now an admin.`);
  })
  .catch((error) => {
    console.error('Error setting custom claims:', error);
  });
