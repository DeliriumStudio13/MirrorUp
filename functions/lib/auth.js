"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusinessAndAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
exports.createBusinessAndAdmin = (0, https_1.onCall)({ cors: true }, async (request) => {
    try {
        const { businessData, adminData, password } = request.data;
        // Validate input
        if (!(businessData === null || businessData === void 0 ? void 0 : businessData.name) || !(businessData === null || businessData === void 0 ? void 0 : businessData.email) || !(businessData === null || businessData === void 0 ? void 0 : businessData.industry)) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required business data');
        }
        if (!(adminData === null || adminData === void 0 ? void 0 : adminData.email) || !(adminData === null || adminData === void 0 ? void 0 : adminData.firstName) || !(adminData === null || adminData === void 0 ? void 0 : adminData.lastName)) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required admin data');
        }
        if (!password || password.length < 6) {
            throw new https_1.HttpsError('invalid-argument', 'Password must be at least 6 characters');
        }
        firebase_functions_1.logger.info('Creating business and admin user', {
            businessEmail: businessData.email,
            adminEmail: adminData.email
        });
        // Create Firebase Auth user for admin
        const firebaseUser = await config_1.auth.createUser({
            email: adminData.email,
            password: password,
            displayName: `${adminData.firstName} ${adminData.lastName}`,
            emailVerified: false
        });
        // Generate business ID
        const businessId = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Create business document
        const businessDoc = {
            name: businessData.name,
            email: businessData.email,
            phone: businessData.phone || null,
            industry: businessData.industry,
            settings: {
                evaluationCycle: 'annual',
                bonusCalculation: 'performance-based',
                defaultCurrency: 'USD',
                workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            },
            isActive: true,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        await config_1.db.collection('businesses').doc(businessId).set(businessDoc);
        // 🚀 NEW: Create admin user document in subcollection (no businessId - implicit in path)
        const userDoc = {
            profile: {
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                email: adminData.email,
                phone: adminData.phone || null,
                avatar: null
            },
            role: 'admin',
            employeeInfo: {
                employeeId: `EMP_${Date.now()}`,
                department: null,
                position: 'Administrator',
                hireDate: firestore_1.FieldValue.serverTimestamp(),
                salary: null,
                manager: null
            },
            permissions: {
                canManageUsers: true,
                canManageDepartments: true,
                canManageEvaluations: true,
                canViewAnalytics: true,
                canManageSettings: true,
                canCalculateBonuses: true
            },
            isActive: true,
            lastLogin: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        await config_1.db.collection('businesses').doc(businessId).collection('users').doc(firebaseUser.uid).set(userDoc);
        // 🚀 NEW: Create user-business mapping for authentication lookups
        await config_1.db.collection('userBusinessMap').doc(firebaseUser.uid).set({
            businessId,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        firebase_functions_1.logger.info('Successfully created business and admin user', {
            businessId,
            userId: firebaseUser.uid
        });
        return {
            success: true,
            message: 'Business and admin user created successfully',
            businessId,
            userId: firebaseUser.uid
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating business and admin:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Handle Firebase Auth errors
        const authError = error;
        if (authError.code === 'auth/email-already-in-use') {
            throw new https_1.HttpsError('already-exists', 'An account with this email already exists');
        }
        if (authError.code === 'auth/weak-password') {
            throw new https_1.HttpsError('invalid-argument', 'Password is too weak');
        }
        if (authError.code === 'auth/invalid-email') {
            throw new https_1.HttpsError('invalid-argument', 'Invalid email address');
        }
        throw new https_1.HttpsError('internal', 'Failed to create business account');
    }
});
//# sourceMappingURL=auth.js.map