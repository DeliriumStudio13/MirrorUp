/**
 * Firebase Functions Service
 * Centralized cloud functions operations
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config';

class FunctionsService {
  /**
   * Call a cloud function
   */
  async call(functionName, data = {}, options = {}) {
    try {
      const { timeout = 30000 } = options;
      
      // Ensure user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to call functions');
      }

      console.log('Making function call:', {
        functionName,
        userId: currentUser.uid,
        email: currentUser.email
      });
      
      const callable = httpsCallable(functions, functionName, {
        timeout
      });

      const result = await callable(data);

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error);
      return {
        success: false,
        error: this.handleFunctionError(error)
      };
    }
  }

  /**
   * Business Management Functions
   */
  async registerBusiness(businessData) {
    return this.call('registerBusiness', businessData);
  }

  async updateBusiness(businessId, updates) {
    return this.call('updateBusiness', { businessId, updates });
  }

  async deleteBusiness(businessId) {
    return this.call('deleteBusiness', { businessId });
  }

  /**
   * User Management Functions
   */
  async createUser(userData) {
    return this.call('userCreateUser', userData);
  }

  async updateUserRole(userId, role) {
    return this.call('updateUserRole', { userId, role });
  }

  async deleteUser(userId, businessId) {
    return this.call('userDeleteUser', { userId, businessId });
  }

  async inviteUser(inviteData) {
    return this.call('inviteUser', inviteData);
  }

  async bulkCreateUsers(usersData) {
    return this.call('bulkCreateUsers', { users: usersData }, { timeout: 60000 });
  }

  /**
   * Department Management Functions
   */
  async createDepartment(departmentData) {
    return this.call('departmentCreateDepartment', departmentData);
  }

  async updateDepartment(departmentId, updates) {
    return this.call('departmentUpdateDepartment', { departmentId, updates });
  }

  async deleteDepartment(departmentId) {
    return this.call('departmentDeleteDepartment', { departmentId });
  }

  /**
   * Evaluation Functions
   */
  async createEvaluation(evaluationData) {
    return this.call('createEvaluation', evaluationData);
  }

  async submitEvaluation(evaluationId, responses) {
    return this.call('submitEvaluation', { evaluationId, responses });
  }

  async approveEvaluation(evaluationId, approvalData) {
    return this.call('approveEvaluation', { evaluationId, ...approvalData });
  }

  async rejectEvaluation(evaluationId, rejectionData) {
    return this.call('rejectEvaluation', { evaluationId, ...rejectionData });
  }

  async calculateEvaluationScore(evaluationId) {
    return this.call('calculateEvaluationScore', { evaluationId });
  }

  async generateEvaluationReport(evaluationId, format = 'pdf') {
    return this.call('generateEvaluationReport', { evaluationId, format });
  }

  /**
   * Analytics Functions
   */
  async getDashboardStats(businessId, dateRange = {}) {
    return this.call('getDashboardStats', { businessId, dateRange });
  }

  async getPerformanceAnalytics(businessId, filters = {}) {
    return this.call('getPerformanceAnalytics', { businessId, filters });
  }

  async generateAnalyticsReport(businessId, reportType, options = {}) {
    return this.call('generateAnalyticsReport', { 
      businessId, 
      reportType, 
      options 
    }, { timeout: 60000 });
  }

  /**
   * Bonus Calculation Functions
   */
  async calculateBonuses(businessId, calculationData) {
    return this.call('calculateBonuses', { businessId, ...calculationData });
  }

  async distributeBonuses(businessId, distributionData) {
    return this.call('distributeBonuses', { businessId, ...distributionData });
  }

  async getBonusHistory(businessId, filters = {}) {
    return this.call('getBonusHistory', { businessId, filters });
  }

  /**
   * Notification Functions
   */
  async sendNotification(notificationData) {
    return this.call('sendNotification', notificationData);
  }

  async sendBulkNotifications(notificationsData) {
    return this.call('sendBulkNotifications', { notifications: notificationsData });
  }

  async scheduleNotification(notificationData, scheduleData) {
    return this.call('scheduleNotification', { 
      notification: notificationData, 
      schedule: scheduleData 
    });
  }

  /**
   * Email Functions
   */
  async sendEmail(emailData) {
    return this.call('sendEmail', emailData);
  }

  async sendBulkEmail(emailsData) {
    return this.call('sendBulkEmail', { emails: emailsData });
  }

  async sendEvaluationReminder(evaluationId, recipientId) {
    return this.call('sendEvaluationReminder', { evaluationId, recipientId });
  }

  async sendPasswordResetEmail(email) {
    return this.call('sendPasswordResetEmail', { email });
  }

  /**
   * Data Export Functions
   */
  async exportData(businessId, exportType, options = {}) {
    return this.call('exportData', { 
      businessId, 
      exportType, 
      options 
    }, { timeout: 120000 });
  }

  async exportEvaluations(businessId, filters = {}, format = 'csv') {
    return this.call('exportEvaluations', { 
      businessId, 
      filters, 
      format 
    }, { timeout: 60000 });
  }

  async exportUsers(businessId, format = 'csv') {
    return this.call('exportUsers', { businessId, format });
  }

  /**
   * Data Import Functions
   */
  async importData(businessId, importType, data, options = {}) {
    return this.call('importData', { 
      businessId, 
      importType, 
      data, 
      options 
    }, { timeout: 120000 });
  }

  async validateImportData(importType, data) {
    return this.call('validateImportData', { importType, data });
  }

  /**
   * System Functions
   */
  async healthCheck() {
    return this.call('healthCheck');
  }

  async getSystemStats() {
    return this.call('getSystemStats');
  }

  /**
   * Organization Chart Functions
   */
  async generateOrgChart(businessId, options = {}) {
    return this.call('generateOrgChart', { businessId, options });
  }

  async updateOrgChart(businessId, chartData) {
    return this.call('updateOrgChart', { businessId, chartData });
  }

  /**
   * Handle function errors
   */
  handleFunctionError(error) {
    const errorMessages = {
      'functions/cancelled': 'Function was cancelled.',
      'functions/unknown': 'An unknown error occurred.',
      'functions/invalid-argument': 'Invalid function arguments provided.',
      'functions/deadline-exceeded': 'Function execution timed out.',
      'functions/not-found': 'Function not found.',
      'functions/already-exists': 'Resource already exists.',
      'functions/permission-denied': 'Permission denied.',
      'functions/resource-exhausted': 'Resource quota exceeded.',
      'functions/failed-precondition': 'Function precondition failed.',
      'functions/aborted': 'Function was aborted.',
      'functions/out-of-range': 'Value out of valid range.',
      'functions/unimplemented': 'Function not implemented.',
      'functions/internal': 'Internal server error.',
      'functions/unavailable': 'Service temporarily unavailable.',
      'functions/data-loss': 'Data loss or corruption.',
      'functions/unauthenticated': 'Authentication required.'
    };

    // Extract details from Firebase Functions error
    let details = null;
    if (error.details) {
      try {
        details = typeof error.details === 'string' ? JSON.parse(error.details) : error.details;
      } catch {
        details = error.details;
      }
    }

    const message = errorMessages[error.code] || error.message || 'Function call failed';
    
    console.error('Function Error:', {
      code: error.code,
      message,
      details,
      originalError: error
    });

    return {
      code: error.code,
      message,
      details
    };
  }

  /**
   * Batch function calls
   */
  async batchCall(functionCalls) {
    const results = await Promise.allSettled(
      functionCalls.map(({ name, data, options }) => 
        this.call(name, data, options)
      )
    );

    return results.map((result, index) => ({
      functionName: functionCalls[index].name,
      status: result.status,
      result: result.status === 'fulfilled' ? result.value : result.reason
    }));
  }

  /**
   * Check if a function exists (by attempting to call it with no data)
   */
  async functionExists(functionName) {
    try {
      const callable = httpsCallable(functions, functionName);
      // This will fail if the function doesn't exist
      await callable({});
      return true;
    } catch (error) {
      return error.code !== 'functions/not-found';
    }
  }
}

// Export singleton instance
const functionsService = new FunctionsService();
export default functionsService;
