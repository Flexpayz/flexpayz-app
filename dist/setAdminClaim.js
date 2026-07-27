"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Read and parse the service account file
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const uid = process.argv[2]; // Get the UID from command line arguments
if (!uid) {
    console.error('❌ Please provide a UID as a command-line argument.');
    console.log('👉 Example: npx ts-node admin-scripts/setAdminClaim.ts YOUR_UID_HERE');
    process.exit(1);
}
(0, app_1.initializeApp)({
    credential: (0, app_1.cert)(serviceAccount),
});
const auth = (0, auth_1.getAuth)();
auth.setCustomUserClaims(uid, { admin: true })
    .then(() => {
    console.log(`Success! ${uid} is now an admin.`);
})
    .catch((error) => {
    console.error('Error setting custom claims:', error);
});
