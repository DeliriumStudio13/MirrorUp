import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';

class UserService {
  constructor() {
    // 🚀 NEW: Collection is now dynamic based on business
    this.collection = 'users';
  }

  // 🚀 NEW: Helper to get business-scoped collection path
  getBusinessUsersCollection(businessId) {
    return `businesses/${businessId}/users`;
  }

  // Get all users for a business with pagination and filtering
  async getUsers(businessId, filters = {}) {
    try {
      const {
        page = 1,
        pageSize = 10,
        role = null,
        department = null,
        search = '',
        sortBy = 'profile.firstName',
        sortOrder = 'asc',
        isActive = true
      } = filters;

      // Simple collection query without any filters or ordering
      const userQuery = query(
        collection(db, this.getBusinessUsersCollection(businessId))
      );

      const querySnapshot = await getDocs(userQuery);
      let users = [];
      
      // Client-side filtering
      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Apply all filters client-side
        if (
          // Active status filter
          (!isActive || userData.isActive === isActive) &&
          // Role filter
          (!role || role === 'all' || userData.role === role) &&
          // Department filter
          (!department || department === 'all' || userData.employeeInfo?.department === department) &&
          // Search filter
          (!search || 
            userData.profile.firstName.toLowerCase().includes(search.toLowerCase()) ||
            userData.profile.lastName.toLowerCase().includes(search.toLowerCase()) ||
            userData.email.toLowerCase().includes(search.toLowerCase()) ||
            userData.employeeInfo?.position?.toLowerCase().includes(search.toLowerCase()))
        ) {
          users.push(userData);
        }
      });

      // Client-side sorting
      users.sort((a, b) => {
        const aValue = sortBy.split('.').reduce((obj, key) => obj?.[key], a) || '';
        const bValue = sortBy.split('.').reduce((obj, key) => obj?.[key], b) || '';
        return sortOrder === 'asc' ? 
          aValue.localeCompare(bValue) : 
          bValue.localeCompare(aValue);
      });

      // Apply pagination to search results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return {
        users: paginatedUsers,
        total: users.length,
        page,
        pageSize,
        totalPages: Math.ceil(users.length / pageSize)
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  // Get a single user by ID
  async getUser(userId) {
    try {
      const userDoc = await getDoc(doc(db, this.collection, userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Create a new user
  async createUser(userData, password) {
    try {
      // Use Cloud Function to create user with authentication
      const createUserFunction = httpsCallable(functions, 'users-createUser');
      
      const result = await createUserFunction({
        userData,
        password
      });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to create user');
      }

      return result.data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updates) {
    try {
      const userRef = doc(db, this.collection, userId);
      
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Get updated user data
      const updatedUser = await this.getUser(userId);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Soft delete user (deactivate)
  async deleteUser(userId) {
    try {
      // Use Cloud Function for proper cleanup
      const deleteUserFunction = httpsCallable(functions, 'auth-deleteUser');
      
      const result = await deleteUserFunction({ userId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to delete user');
      }

      return result.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user's subordinates
  async getUserSubordinates(managerId, businessId) {
    try {
      // 🚀 NEW: Use subcollection
      const subordinatesQuery = query(
        collection(db, this.getBusinessUsersCollection(businessId)),
        where('employeeInfo.manager', '==', managerId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(subordinatesQuery);
      const subordinates = [];

      querySnapshot.forEach((doc) => {
        subordinates.push({ id: doc.id, ...doc.data() });
      });

      return subordinates;
    } catch (error) {
      console.error('Error getting subordinates:', error);
      throw error;
    }
  }

  // Get users by department
  async getUsersByDepartment(departmentId, businessId) {
    try {
      // 🚀 NEW: Use subcollection
      const usersQuery = query(
        collection(db, this.getBusinessUsersCollection(businessId)),
        where('employeeInfo.department', '==', departmentId),
        where('isActive', '==', true),
        orderBy('profile.firstName')
      );

      const querySnapshot = await getDocs(usersQuery);
      const users = [];

      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      return users;
    } catch (error) {
      console.error('Error getting users by department:', error);
      throw error;
    }
  }

  // Update user's manager
  async updateUserManager(userId, managerId) {
    try {
      const userRef = doc(db, this.collection, userId);
      
      await updateDoc(userRef, {
        'employeeInfo.manager': managerId,
        updatedAt: serverTimestamp()
      });

      return await this.getUser(userId);
    } catch (error) {
      console.error('Error updating user manager:', error);
      throw error;
    }
  }

  // Bulk import users
  async bulkImportUsers(users) {
    try {
      const bulkImportFunction = httpsCallable(functions, 'users-bulkImport');
      
      const result = await bulkImportFunction({ users });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Bulk import failed');
      }

      return result.data;
    } catch (error) {
      console.error('Error bulk importing users:', error);
      throw error;
    }
  }

  // Get user performance metrics
  async getUserPerformanceMetrics(userId) {
    try {
      const metricsFunction = httpsCallable(functions, 'users-getPerformanceMetrics');
      
      const result = await metricsFunction({ userId });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to get performance metrics');
      }

      return result.data.metrics;
    } catch (error) {
      console.error('Error getting user performance metrics:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(businessId, searchTerm, filters = {}) {
    try {
      const { role, department, limit: searchLimit = 50 } = filters;

      // 🚀 NEW: Use subcollection - no businessId filter needed!
      let userQuery = query(
        collection(db, this.getBusinessUsersCollection(businessId)),
        where('isActive', '==', true),
        limit(searchLimit)
      );

      // Add role filter
      if (role && role !== 'all') {
        userQuery = query(userQuery, where('role', '==', role));
      }

      // Add department filter
      if (department && department !== 'all') {
        userQuery = query(userQuery, where('employeeInfo.department', '==', department));
      }

      const querySnapshot = await getDocs(userQuery);
      const users = [];

      querySnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Client-side search filtering
        if (!searchTerm || 
            userData.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.employeeInfo?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.employeeInfo?.position?.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push(userData);
        }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;
