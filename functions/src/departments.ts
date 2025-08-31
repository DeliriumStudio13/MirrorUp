/**
 * Cloud Functions for Department Management
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db } from './config';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

// Interface for department creation data
interface CreateDepartmentData {
  name: string;
  description?: string;
  parentDepartment?: string;
  manager?: string;
  budget?: number;
  location?: string;
}

interface CreateDepartmentRequest {
  departmentData: CreateDepartmentData;
  businessId: string;
}

/**
 * Creates a new department
 */
export const createDepartment = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { departmentData, businessId } = request.data as CreateDepartmentRequest;

  // Validate input data
  if (!departmentData || !businessId) {
    throw new HttpsError('invalid-argument', 'Missing required department data or business ID');
  }

  // Validate required fields
  if (!departmentData.name) {
    throw new HttpsError('invalid-argument', 'Department name is required');
  }

  try {
    // 🚀 NEW: First get user's business from mapping table
    const mappingDoc = await db.collection('userBusinessMap').doc(request.auth.uid).get();
    if (!mappingDoc.exists) {
      throw new HttpsError('permission-denied', 'User business mapping not found');
    }
    const userBusinessId = mappingDoc.data()?.businessId;
    
    // Verify the requesting user has permission to create departments
    const requestingUserDoc = await db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
    
    if (!requestingUserDoc.exists) {
      throw new HttpsError('permission-denied', 'Requesting user not found');
    }

    const requestingUser = requestingUserDoc.data();
    
    // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
    if (!requestingUser?.permissions?.canManageDepartments && requestingUser?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Insufficient permissions to create departments');
    }

    // Verify business exists
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      throw new HttpsError('not-found', 'Business not found');
    }

    // If parent department is specified, verify it exists (already scoped to business by subcollection)
    if (departmentData.parentDepartment) {
      const parentDeptDoc = await db.collection('businesses').doc(businessId).collection('departments').doc(departmentData.parentDepartment).get();
      
      if (!parentDeptDoc.exists) {
        throw new HttpsError('invalid-argument', 'Parent department not found');
      }
    }

    // 🚀 NEW: Check if department name already exists - use subcollection and filter in code
    const existingDeptQuery = await db.collection('businesses').doc(businessId).collection('departments').get();
    
    const duplicateName = existingDeptQuery.docs.find(doc => {
      const data = doc.data();
      return data.name === departmentData.name && data.isActive === true;
    });
    
    if (duplicateName) {
      throw new HttpsError('already-exists', 'A department with this name already exists');
    }

    // 🚀 NEW: Create department document (no businessId - implicit in subcollection)
    const departmentDocument = {
      name: departmentData.name.trim(),
      description: departmentData.description?.trim() || null,
      parentDepartment: departmentData.parentDepartment || null,
      manager: departmentData.manager || null,
      budget: departmentData.budget || null,
      location: departmentData.location?.trim() || null,
      employeeCount: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const departmentRef = await db.collection('businesses').doc(businessId).collection('departments').add(departmentDocument);

    logger.info('Successfully created department', { 
      departmentId: departmentRef.id, 
      businessId, 
      name: departmentData.name 
    });

    // Return the created department data
    const createdDepartment = {
      id: departmentRef.id,
      ...departmentDocument,
      createdAt: new Date(), // Replace server timestamp for response
      updatedAt: new Date()
    };

    return {
      success: true,
      message: 'Department created successfully',
      department: createdDepartment
    };

  } catch (error: unknown) {
    logger.error('Error creating department:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'Failed to create department');
  }
});

/**
 * Deletes a department
 */
export const deleteDepartment = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { departmentId, businessId } = request.data as { departmentId: string; businessId: string };

  // Validate input data
  if (!departmentId || !businessId) {
    throw new HttpsError('invalid-argument', 'Missing required department ID or business ID');
  }

  try {
    // 🚀 NEW: First get user's business from mapping table
    const mappingDoc = await db.collection('userBusinessMap').doc(request.auth.uid).get();
    if (!mappingDoc.exists) {
      throw new HttpsError('permission-denied', 'User business mapping not found');
    }
    const userBusinessId = mappingDoc.data()?.businessId;
    
    // Verify the requesting user has permission to delete departments
    const requestingUserDoc = await db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
    
    if (!requestingUserDoc.exists) {
      throw new HttpsError('permission-denied', 'Requesting user not found');
    }

    const requestingUser = requestingUserDoc.data();
    
    // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
    if (!requestingUser?.permissions?.canManageDepartments && requestingUser?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Insufficient permissions to delete departments');
    }

    // 🚀 NEW: Verify department exists (already scoped to business by subcollection)
    const departmentDoc = await db.collection('businesses').doc(businessId).collection('departments').doc(departmentId).get();
    
    if (!departmentDoc.exists) {
      throw new HttpsError('not-found', 'Department not found');
    }

    // 🚀 NEW: Check if department has employees - use subcollection and filter in code
    const employeesQuery = await db.collection('businesses').doc(businessId).collection('users').get();
    
    const hasEmployees = employeesQuery.docs.find(doc => {
      const data = doc.data();
      return data.employeeInfo?.department === departmentId && data.isActive === true;
    });
    
    if (hasEmployees) {
      throw new HttpsError('failed-precondition', 'Cannot delete department with active employees. Please reassign employees first.');
    }

    // 🚀 NEW: Check if department has child departments - use subcollection and filter in code
    const childDeptQuery = await db.collection('businesses').doc(businessId).collection('departments').get();
    
    const hasChildDepts = childDeptQuery.docs.find(doc => {
      const data = doc.data();
      return data.parentDepartment === departmentId && data.isActive === true;
    });

    if (hasChildDepts) {
      throw new HttpsError('failed-precondition', 'Cannot delete department with child departments. Please reorganize the hierarchy first.');
    }

    // 🚀 NEW: Soft delete the department (mark as inactive instead of removing)
    await db.collection('businesses').doc(businessId).collection('departments').doc(departmentId).update({
      isActive: false,
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    logger.info('Successfully deleted department', { departmentId, businessId });

    return {
      success: true,
      message: 'Department deleted successfully'
    };

  } catch (error: unknown) {
    logger.error('Error deleting department:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'Failed to delete department');
  }
});
