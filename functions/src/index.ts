/**
 * Cloud Functions for MirrorUp Employee Evaluation System
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';

// Import auth functions
import { createBusinessAndAdmin } from './auth';

// Import user management functions
import { createUser, deleteUser } from './users';

// Import department management functions
import { createDepartment, deleteDepartment } from './departments';

// Export auth functions with hyphenated names to match frontend calls
export const authCreateBusinessAndAdmin = createBusinessAndAdmin;

// Export user management functions
export const userCreateUser = createUser;
export const userDeleteUser = deleteUser;

// Export department management functions
export const departmentCreateDepartment = createDepartment;
export const departmentDeleteDepartment = deleteDepartment;

// Health check function
export const healthCheck = onRequest({ cors: true }, (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: admin.firestore.Timestamp.now(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});