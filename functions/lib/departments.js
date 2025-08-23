"use strict";
/**
 * Cloud Functions for Department Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.createDepartment = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Creates a new department
 */
exports.createDepartment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    // Check if user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { departmentData, businessId } = request.data;
    // Validate input data
    if (!departmentData || !businessId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required department data or business ID');
    }
    // Validate required fields
    if (!departmentData.name) {
        throw new https_1.HttpsError('invalid-argument', 'Department name is required');
    }
    try {
        // Verify the requesting user has permission to create departments
        const requestingUserDoc = await config_1.db.collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if requesting user belongs to the same business and has admin/hr permissions
        if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.businessId) !== businessId ||
            (!((_a = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _a === void 0 ? void 0 : _a.canManageDepartments) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin')) {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to create departments');
        }
        // Verify business exists
        const businessDoc = await config_1.db.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Business not found');
        }
        // If parent department is specified, verify it exists and belongs to the same business
        if (departmentData.parentDepartment) {
            const parentDeptDoc = await config_1.db.collection('departments').doc(departmentData.parentDepartment).get();
            if (!parentDeptDoc.exists) {
                throw new https_1.HttpsError('invalid-argument', 'Parent department not found');
            }
            const parentDept = parentDeptDoc.data();
            if ((parentDept === null || parentDept === void 0 ? void 0 : parentDept.businessId) !== businessId) {
                throw new https_1.HttpsError('invalid-argument', 'Parent department does not belong to this business');
            }
        }
        // Check if department name already exists in this business
        const existingDeptQuery = await config_1.db.collection('departments')
            .where('businessId', '==', businessId)
            .where('name', '==', departmentData.name)
            .where('isActive', '==', true)
            .limit(1)
            .get();
        if (!existingDeptQuery.empty) {
            throw new https_1.HttpsError('already-exists', 'A department with this name already exists');
        }
        // Create department document
        const departmentDocument = {
            businessId,
            name: departmentData.name.trim(),
            description: ((_b = departmentData.description) === null || _b === void 0 ? void 0 : _b.trim()) || null,
            parentDepartment: departmentData.parentDepartment || null,
            manager: departmentData.manager || null,
            budget: departmentData.budget || null,
            location: ((_c = departmentData.location) === null || _c === void 0 ? void 0 : _c.trim()) || null,
            employeeCount: 0,
            isActive: true,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        const departmentRef = await config_1.db.collection('departments').add(departmentDocument);
        firebase_functions_1.logger.info('Successfully created department', {
            departmentId: departmentRef.id,
            businessId,
            name: departmentData.name
        });
        // Return the created department data
        const createdDepartment = Object.assign(Object.assign({ id: departmentRef.id }, departmentDocument), { createdAt: new Date(), updatedAt: new Date() });
        return {
            success: true,
            message: 'Department created successfully',
            department: createdDepartment
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error creating department:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to create department');
    }
});
/**
 * Deletes a department
 */
exports.deleteDepartment = (0, https_1.onCall)(async (request) => {
    var _a;
    // Check if user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { departmentId, businessId } = request.data;
    // Validate input data
    if (!departmentId || !businessId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required department ID or business ID');
    }
    try {
        // Verify the requesting user has permission to delete departments
        const requestingUserDoc = await config_1.db.collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if requesting user belongs to the same business and has admin/hr permissions
        if ((requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.businessId) !== businessId ||
            (!((_a = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _a === void 0 ? void 0 : _a.canManageDepartments) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin')) {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to delete departments');
        }
        // Verify department exists and belongs to the same business
        const departmentDoc = await config_1.db.collection('departments').doc(departmentId).get();
        if (!departmentDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Department not found');
        }
        const department = departmentDoc.data();
        if ((department === null || department === void 0 ? void 0 : department.businessId) !== businessId) {
            throw new https_1.HttpsError('permission-denied', 'Department not found in this business');
        }
        // Check if department has employees
        const employeesQuery = await config_1.db.collection('users')
            .where('businessId', '==', businessId)
            .where('employeeInfo.department', '==', departmentId)
            .where('isActive', '==', true)
            .limit(1)
            .get();
        if (!employeesQuery.empty) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot delete department with active employees. Please reassign employees first.');
        }
        // Check if department has child departments
        const childDeptQuery = await config_1.db.collection('departments')
            .where('businessId', '==', businessId)
            .where('parentDepartment', '==', departmentId)
            .where('isActive', '==', true)
            .limit(1)
            .get();
        if (!childDeptQuery.empty) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot delete department with child departments. Please reorganize the hierarchy first.');
        }
        // Soft delete the department (mark as inactive instead of removing)
        await config_1.db.collection('departments').doc(departmentId).update({
            isActive: false,
            deletedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        firebase_functions_1.logger.info('Successfully deleted department', { departmentId, businessId });
        return {
            success: true,
            message: 'Department deleted successfully'
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error deleting department:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to delete department');
    }
});
//# sourceMappingURL=departments.js.map