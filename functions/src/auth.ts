import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db } from './config';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

interface BusinessData {
  name: string;
  email: string;
  phone?: string;
  industry: string;
}

interface AdminData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface CreateBusinessAndAdminRequest {
  businessData: BusinessData;
  adminData: AdminData;
  password: string;
}

export const createBusinessAndAdmin = onCall(
  { cors: true },
  async (request) => {
    try {
      const { businessData, adminData, password } = request.data as CreateBusinessAndAdminRequest;

      // Validate input
      if (!businessData?.name || !businessData?.email || !businessData?.industry) {
        throw new HttpsError('invalid-argument', 'Missing required business data');
      }

      if (!adminData?.email || !adminData?.firstName || !adminData?.lastName) {
        throw new HttpsError('invalid-argument', 'Missing required admin data');
      }

      if (!password || password.length < 6) {
        throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
      }

      logger.info('Creating business and admin user', { 
        businessEmail: businessData.email,
        adminEmail: adminData.email 
      });

      // Create Firebase Auth user for admin
      const firebaseUser = await auth.createUser({
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await db.collection('businesses').doc(businessId).set(businessDoc);

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
          hireDate: FieldValue.serverTimestamp(),
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await db.collection('businesses').doc(businessId).collection('users').doc(firebaseUser.uid).set(userDoc);
      
      // 🚀 NEW: Create user-business mapping for authentication lookups
      await db.collection('userBusinessMap').doc(firebaseUser.uid).set({
        businessId,
        createdAt: FieldValue.serverTimestamp()
      });

      logger.info('Successfully created business and admin user', { 
        businessId,
        userId: firebaseUser.uid 
      });

      return {
        success: true,
        message: 'Business and admin user created successfully',
        businessId,
        userId: firebaseUser.uid
      };

    } catch (error) {
      logger.error('Error creating business and admin:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle Firebase Auth errors
      const authError = error as any;
      if (authError.code === 'auth/email-already-in-use') {
        throw new HttpsError('already-exists', 'An account with this email already exists');
      }

      if (authError.code === 'auth/weak-password') {
        throw new HttpsError('invalid-argument', 'Password is too weak');
      }

      if (authError.code === 'auth/invalid-email') {
        throw new HttpsError('invalid-argument', 'Invalid email address');
      }

      throw new HttpsError('internal', 'Failed to create business account');
    }
  }
);