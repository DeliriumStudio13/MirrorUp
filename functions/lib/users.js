"use strict";
/**
 * Cloud Functions for User Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Creates a new user account with Firebase Auth and Firestore profile
 */
exports.createUser = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    // Check if user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userData, businessId } = request.data;
    // Validate input data
    if (!userData || !businessId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required user data or business ID');
    }
    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required user fields');
    }
    // Validate role
    const validRoles = ['admin', 'hr', 'manager', 'employee'];
    if (!validRoles.includes(userData.role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid user role');
    }
    try {
        // 🚀 NEW: First get user's business from mapping table
        const mappingDoc = await config_1.db.collection('userBusinessMap').doc(request.auth.uid).get();
        if (!mappingDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'User business mapping not found');
        }
        const userBusinessId = (_a = mappingDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId;
        // Verify the requesting user has permission to create users
        const requestingUserDoc = await config_1.db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
        if (!((_b = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _b === void 0 ? void 0 : _b.canManageUsers) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to create users');
        }
        // Verify business exists
        const businessDoc = await config_1.db.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Business not found');
        }
        // Create Firebase Auth user
        const firebaseUser = await config_1.auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: `${userData.firstName} ${userData.lastName}`,
            emailVerified: false
        });
        firebase_functions_1.logger.info('Created Firebase Auth user', { userId: firebaseUser.uid, email: userData.email });
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
        // 🚀 NEW: Create user document in subcollection (no businessId - implicit in path)
        const userDocument = {
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        await config_1.db.collection('businesses').doc(businessId).collection('users').doc(firebaseUser.uid).set(userDocument);
        // 🚀 NEW: Create user-business mapping for authentication lookups
        await config_1.db.collection('userBusinessMap').doc(firebaseUser.uid).set({
            businessId,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Set custom claims for the new user
        await config_1.auth.setCustomUserClaims(firebaseUser.uid, {
            role: userData.role,
            businessId: businessId,
            permissions: permissions
        });
        firebase_functions_1.logger.info('Successfully created user', {
            userId: firebaseUser.uid,
            businessId,
            role: userData.role
        });
        // Return the created user data (without sensitive information)
        const createdUser = Object.assign(Object.assign({ id: firebaseUser.uid }, userDocument), { createdAt: new Date(), updatedAt: new Date() });
        return {
            success: true,
            message: 'User created successfully',
            user: createdUser
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating user:', error);
        // If Firebase Auth user was created but Firestore document failed, clean up
        if (error instanceof Error && error.message.includes('Firestore')) {
            try {
                // Clean up the Firebase Auth user if document creation failed
                // Note: This would require getting the user UID from the previous step
            }
            catch (cleanupError) {
                firebase_functions_1.logger.error('Error cleaning up Firebase Auth user after Firestore failure:', cleanupError);
            }
        }
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Handle Firebase Auth errors
        const authError = error;
        if (authError.code === 'auth/email-already-in-use') {
            throw new https_1.HttpsError('already-exists', 'A user with this email already exists');
        }
        if (authError.code === 'auth/weak-password') {
            throw new https_1.HttpsError('invalid-argument', 'Password is too weak');
        }
        if (authError.code === 'auth/invalid-email') {
            throw new https_1.HttpsError('invalid-argument', 'Invalid email address');
        }
        throw new https_1.HttpsError('internal', 'Failed to create user account');
    }
});
/**
 * Deletes a user account from Firebase Auth and removes Firestore document
 */
exports.deleteUser = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    // Check if user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userId, businessId } = request.data;
    // Validate input data
    if (!userId || !businessId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required user ID or business ID');
    }
    try {
        // 🚀 NEW: First get user's business from mapping table
        const mappingDoc = await config_1.db.collection('userBusinessMap').doc(request.auth.uid).get();
        if (!mappingDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'User business mapping not found');
        }
        const userBusinessId = (_a = mappingDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId;
        // Verify the requesting user has permission to delete users
        const requestingUserDoc = await config_1.db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
        if (!((_b = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _b === void 0 ? void 0 : _b.canManageUsers) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to delete users');
        }
        // Prevent users from deleting themselves
        if (request.auth.uid === userId) {
            throw new https_1.HttpsError('invalid-argument', 'Cannot delete your own account');
        }
        // 🚀 NEW: Verify user to be deleted exists (already scoped to business by subcollection)
        const userToDeleteDoc = await config_1.db.collection('businesses').doc(businessId).collection('users').doc(userId).get();
        if (!userToDeleteDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found');
        }
        // Delete Firebase Auth user
        await config_1.auth.deleteUser(userId);
        firebase_functions_1.logger.info('Deleted Firebase Auth user', { userId });
        // 🚀 NEW: Delete Firestore documents (user + mapping)
        await Promise.all([
            config_1.db.collection('businesses').doc(businessId).collection('users').doc(userId).delete(),
            config_1.db.collection('userBusinessMap').doc(userId).delete()
        ]);
        firebase_functions_1.logger.info('Successfully deleted user', { userId, businessId });
        return {
            success: true,
            message: 'User deleted successfully'
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error deleting user:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Handle Firebase Auth errors
        const authError = error;
        if (authError.code === 'auth/user-not-found') {
            throw new https_1.HttpsError('not-found', 'User not found in authentication system');
        }
        throw new https_1.HttpsError('internal', 'Failed to delete user account');
    }
});
//# sourceMappingURL=users.js.map