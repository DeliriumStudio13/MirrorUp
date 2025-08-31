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
    var _a, _b, _c, _d;
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
        // 🚀 NEW: First get user's business from mapping table
        const mappingDoc = await config_1.db.collection('userBusinessMap').doc(request.auth.uid).get();
        if (!mappingDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'User business mapping not found');
        }
        const userBusinessId = (_a = mappingDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId;
        // Verify the requesting user has permission to create departments
        const requestingUserDoc = await config_1.db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
        if (!((_b = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _b === void 0 ? void 0 : _b.canManageDepartments) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to create departments');
        }
        // Verify business exists
        const businessDoc = await config_1.db.collection('businesses').doc(businessId).get();
        if (!businessDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Business not found');
        }
        // If parent department is specified, verify it exists (already scoped to business by subcollection)
        if (departmentData.parentDepartment) {
            const parentDeptDoc = await config_1.db.collection('businesses').doc(businessId).collection('departments').doc(departmentData.parentDepartment).get();
            if (!parentDeptDoc.exists) {
                throw new https_1.HttpsError('invalid-argument', 'Parent department not found');
            }
        }
        // 🚀 NEW: Check if department name already exists - use subcollection and filter in code
        const existingDeptQuery = await config_1.db.collection('businesses').doc(businessId).collection('departments').get();
        const duplicateName = existingDeptQuery.docs.find(doc => {
            const data = doc.data();
            return data.name === departmentData.name && data.isActive === true;
        });
        if (duplicateName) {
            throw new https_1.HttpsError('already-exists', 'A department with this name already exists');
        }
        // 🚀 NEW: Create department document (no businessId - implicit in subcollection)
        const departmentDocument = {
            name: departmentData.name.trim(),
            description: ((_c = departmentData.description) === null || _c === void 0 ? void 0 : _c.trim()) || null,
            parentDepartment: departmentData.parentDepartment || null,
            manager: departmentData.manager || null,
            budget: departmentData.budget || null,
            location: ((_d = departmentData.location) === null || _d === void 0 ? void 0 : _d.trim()) || null,
            employeeCount: 0,
            isActive: true,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        const departmentRef = await config_1.db.collection('businesses').doc(businessId).collection('departments').add(departmentDocument);
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
    var _a, _b;
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
        // 🚀 NEW: First get user's business from mapping table
        const mappingDoc = await config_1.db.collection('userBusinessMap').doc(request.auth.uid).get();
        if (!mappingDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'User business mapping not found');
        }
        const userBusinessId = (_a = mappingDoc.data()) === null || _a === void 0 ? void 0 : _a.businessId;
        // Verify the requesting user has permission to delete departments
        const requestingUserDoc = await config_1.db.collection('businesses').doc(userBusinessId).collection('users').doc(request.auth.uid).get();
        if (!requestingUserDoc.exists) {
            throw new https_1.HttpsError('permission-denied', 'Requesting user not found');
        }
        const requestingUser = requestingUserDoc.data();
        // Check if user has admin/hr permissions (no businessId check needed - already scoped by subcollection)
        if (!((_b = requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.permissions) === null || _b === void 0 ? void 0 : _b.canManageDepartments) && (requestingUser === null || requestingUser === void 0 ? void 0 : requestingUser.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Insufficient permissions to delete departments');
        }
        // 🚀 NEW: Verify department exists (already scoped to business by subcollection)
        const departmentDoc = await config_1.db.collection('businesses').doc(businessId).collection('departments').doc(departmentId).get();
        if (!departmentDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Department not found');
        }
        // 🚀 NEW: Check if department has employees - use subcollection and filter in code
        const employeesQuery = await config_1.db.collection('businesses').doc(businessId).collection('users').get();
        const hasEmployees = employeesQuery.docs.find(doc => {
            var _a;
            const data = doc.data();
            return ((_a = data.employeeInfo) === null || _a === void 0 ? void 0 : _a.department) === departmentId && data.isActive === true;
        });
        if (hasEmployees) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot delete department with active employees. Please reassign employees first.');
        }
        // 🚀 NEW: Check if department has child departments - use subcollection and filter in code
        const childDeptQuery = await config_1.db.collection('businesses').doc(businessId).collection('departments').get();
        const hasChildDepts = childDeptQuery.docs.find(doc => {
            const data = doc.data();
            return data.parentDepartment === departmentId && data.isActive === true;
        });
        if (hasChildDepts) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot delete department with child departments. Please reorganize the hierarchy first.');
        }
        // 🚀 NEW: Soft delete the department (mark as inactive instead of removing)
        await config_1.db.collection('businesses').doc(businessId).collection('departments').doc(departmentId).update({
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