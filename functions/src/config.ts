/**
 * Firebase Configuration for Cloud Functions
 */

import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
const app = admin.apps.length > 0 ? admin.app() : admin.initializeApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Set Firestore settings
db.settings({ ignoreUndefinedProperties: true });

export default app;
