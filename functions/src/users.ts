/**
 * Cloud Functions for User Management
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db } from './config';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

// Interface for user creation data
interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'hr' | 'manager' | 'employee';
  department?: string;
  position: string;
  phone?: string;
  hireDate: string;
}

interface CreateUserRequest {
  userData: CreateUserData;
  businessId: string;
}

/**
 * Creates a new user account with Firebase Auth and Firestore profile
 */
export const createUser = onCall({ cors: true }, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userData, businessId } = request.data as CreateUserRequest;

  // Validate input data
  if (!userData || !businessId) {
    throw new HttpsError('invalid-argument', 'Missing required user data or business ID');
  }

  // Validate required fields
  if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
    throw new HttpsError('invalid-argument', 'Missing required user fields');
  }

  // Validate role
  const validRoles = ['admin', 'hr', 'manager', 'employee'];
  if (!validRoles.includes(userData.role)) {
    throw new HttpsError('invalid-argument', 'Invalid user role');
  }

  try {
    // Verify the requesting user has permission to create users
    const requestingUserDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!requestingUserDoc.exists) {
      throw new HttpsError('permission-denied', 'Requesting user not found');
    }

    const requestingUser = requestingUserDoc.data();
    
    // Check if requesting user belongs to the same business and has admin/hr permissions
    if (requestingUser?.businessId !== businessId || 
        (!requestingUser?.permissions?.canManageUsers && requestingUser?.role !== 'admin')) {
      throw new HttpsError('permission-denied', 'Insufficient permissions to create users');
    }

    // Verify business exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      throw new HttpsError('not-found', 'Business not found');
    }

    // Create Firebase Auth user
    const firebaseUser = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`,
      emailVerified: false
    });

    logger.info('Created Firebase Auth user', { userId: firebaseUser.uid, email: userData.email });

    // Generate employee ID
    const employeeId = `EMP_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Determine permissions based on role
    let permissions = {
      canManageUsers: false,
      canManageDepartments: false,
      canManageEvaluations: false,
      canViewAnalytics: false,
      canManageSettings: false,
      canCalculateBonuses: false
    };

    switch (userData.role) {
      case 'admin':
        permissions = {
          canManageUsers: true,
          canManageDepartments: true,
          canManageEvaluations: true,
          canViewAnalytics: true,
          canManageSettings: true,
          canCalculateBonuses: true
        };
        break;
      case 'hr':
        permissions = {
          canManageUsers: true,
          canManageDepartments: true,
          canManageEvaluations: true,
          canViewAnalytics: true,
          canManageSettings: false,
          canCalculateBonuses: true
        };
        break;
      case 'manager':
        permissions = {
          canManageUsers: false,
          canManageDepartments: false,
          canManageEvaluations: true,
          canViewAnalytics: true,
          canManageSettings: false,
          canCalculateBonuses: false
        };
        break;
      case 'employee':
      default:
        // Default permissions (all false)
        break;
    }

    // Create user document in Firestore
    const userDocument = {
      businessId,
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone || null,
        avatar: null
      },
      role: userData.role,
      employeeInfo: {
        employeeId,
        department: userData.department || null,
        position: userData.position,
        hireDate: new Date(userData.hireDate),
        salary: null,
        manager: null
      },
      permissions,
      isActive: true,
      lastLogin: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(firebaseUser.uid).set(userDocument);

    // Set custom claims for the new user
    await auth.setCustomUserClaims(firebaseUser.uid, {
      role: userData.role,
      businessId: businessId,
      permissions: permissions
    });

    logger.info('Successfully created user', { 
      userId: firebaseUser.uid, 
      businessId, 
      role: userData.role 
    });

    // Return the created user data (without sensitive information)
    const createdUser = {
      id: firebaseUser.uid,
      ...userDocument,
      createdAt: new Date(), // Replace server timestamp for response
      updatedAt: new Date()
    };

    return {
      success: true,
      message: 'User created successfully',
      user: createdUser
    };

  } catch (error: unknown) {
    logger.error('Error creating user:', error);

    // If Firebase Auth user was created but Firestore document failed, clean up
    if (error instanceof Error && error.message.includes('Firestore')) {
      try {
        // Clean up the Firebase Auth user if document creation failed
        // Note: This would require getting the user UID from the previous step
      } catch (cleanupError) {
        logger.error('Error cleaning up Firebase Auth user after Firestore failure:', cleanupError);
      }
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    // Handle Firebase Auth errors
    const authError = error as any;
    if (authError.code === 'auth/email-already-in-use') {
      throw new HttpsError('already-exists', 'A user with this email already exists');
    }
    if (authError.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Password is too weak');
    }
    if (authError.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'Invalid email address');
    }

    throw new HttpsError('internal', 'Failed to create user account');
  }
});

/**
 * Deletes a user account from Firebase Auth and removes Firestore document
 */
export const deleteUser = onCall({ cors: true }, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, businessId } = request.data as { userId: string; businessId: string };

  // Validate input data
  if (!userId || !businessId) {
    throw new HttpsError('invalid-argument', 'Missing required user ID or business ID');
  }

  try {
    // Verify the requesting user has permission to delete users
    const requestingUserDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!requestingUserDoc.exists) {
      throw new HttpsError('permission-denied', 'Requesting user not found');
    }

    const requestingUser = requestingUserDoc.data();
    
    // Check if requesting user belongs to the same business and has admin/hr permissions
    if (requestingUser?.businessId !== businessId || 
        (!requestingUser?.permissions?.canManageUsers && requestingUser?.role !== 'admin')) {
      throw new HttpsError('permission-denied', 'Insufficient permissions to delete users');
    }

    // Prevent users from deleting themselves
    if (request.auth.uid === userId) {
      throw new HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    // Verify user to be deleted exists and belongs to the same business
    const userToDeleteDoc = await db.collection('users').doc(userId).get();
    
    if (!userToDeleteDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userToDelete = userToDeleteDoc.data();
    
    if (userToDelete?.businessId !== businessId) {
      throw new HttpsError('permission-denied', 'User not found in this business');
    }

    // Delete Firebase Auth user
    await auth.deleteUser(userId);
    
    logger.info('Deleted Firebase Auth user', { userId });

    // Delete Firestore document
    await db.collection('users').doc(userId).delete();

    logger.info('Successfully deleted user', { userId, businessId });

    return {
      success: true,
      message: 'User deleted successfully'
    };

  } catch (error: unknown) {
    logger.error('Error deleting user:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    // Handle Firebase Auth errors
    const authError = error as any;
    if (authError.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'User not found in authentication system');
    }

    throw new HttpsError('internal', 'Failed to delete user account');
  }
});
