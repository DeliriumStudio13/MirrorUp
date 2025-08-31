/**
 * Firebase Database Service
 * Centralized Firestore operations with multi-tenant support
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  writeBatch,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config';

class DatabaseService {
  /**
   * Get a document reference
   */
  getDocRef(path, docId) {
    // Handle subcollection paths
    const segments = path.split('/');
    if (segments.length === 1) {
      // Root collection
      return doc(db, path, docId);
    } else {
      // Subcollection path
      return doc(db, ...segments, docId);
    }
  }

  /**
   * Get a collection reference
   */
  getCollectionRef(path) {
    // Handle subcollection paths
    const segments = path.split('/');
    if (segments.length === 1) {
      // Root collection
      return collection(db, path);
    } else {
      // Subcollection path
      return collection(db, ...segments);
    }
  }

  /**
   * Get a subcollection path
   */
  getSubcollectionPath(parentPath, parentId, subcollectionName) {
    return `${parentPath}/${parentId}/${subcollectionName}`;
  }

  /**
   * Get a business subcollection path
   */
  getBusinessSubcollectionPath(businessId, subcollectionName) {
    return this.getSubcollectionPath('businesses', businessId, subcollectionName);
  }

  /**
   * Create a new document
   */
  async create(path, data) {
    try {
      const collectionRef = this.getCollectionRef(path);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        id: docRef.id,
        data: { id: docRef.id, ...data }
      };
    } catch (error) {
      console.error(`Error creating document in ${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a document with specific ID
   */
  async createWithId(path, docId, data) {
    try {
      const docRef = this.getDocRef(path, docId);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        id: docId,
        data: { id: docId, ...data }
      };
    } catch (error) {
      console.error(`Error creating document ${docId} in ${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a single document
   */
  async getById(path, docId) {
    try {
      const docRef = this.getDocRef(path, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          success: true,
          data: { id: docSnap.id, ...docSnap.data() }
        };
      } else {
        return {
          success: false,
          error: 'Document not found'
        };
      }
    } catch (error) {
      console.error(`Error getting document ${docId} from ${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get multiple documents with optional filters
   */
  async getMany(path, filters = [], orderByField = null, orderDirection = 'asc', limitCount = null) {
    try {
      let q = this.getCollectionRef(path);

      // Apply where filters
      if (filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }

      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const docs = [];

      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });

      return {
        success: true,
        data: docs,
        count: docs.length
      };
    } catch (error) {
      console.error(`Error getting documents from ${path}:`, error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Update a document
   */
  async update(path, docId, data) {
    try {
      const docRef = this.getDocRef(path, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Document updated successfully'
      };
    } catch (error) {
      console.error(`Error updating document ${docId} in ${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a document
   */
  async delete(path, docId) {
    try {
      const docRef = this.getDocRef(path, docId);
      await deleteDoc(docRef);

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${path}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Soft delete a document (mark as inactive)
   */
  async softDelete(path, docId) {
    return this.update(path, docId, { 
      isActive: false,
      deletedAt: serverTimestamp()
    });
  }

  /**
   * Batch operations
   */
  async batchWrite(operations) {
    try {
      const batch = writeBatch(db);

      operations.forEach(operation => {
        const { type, path, id, data } = operation;
        const docRef = this.getDocRef(path, id);

        switch (type) {
          case 'set':
            batch.set(docRef, { ...data, updatedAt: serverTimestamp() });
            break;
          case 'update':
            batch.update(docRef, { ...data, updatedAt: serverTimestamp() });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            throw new Error(`Unknown batch operation type: ${type}`);
        }
      });

      await batch.commit();

      return {
        success: true,
        message: `Batch operation completed (${operations.length} operations)`
      };
    } catch (error) {
      console.error('Error in batch operation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run a transaction
   */
  async runTransaction(transactionCallback) {
    try {
      const result = await runTransaction(db, transactionCallback);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Listen to real-time updates
   */
  onSnapshot(path, filters = [], callback, errorCallback = null) {
    try {
      let q = this.getCollectionRef(path);

      // Apply filters
      if (filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }

      return onSnapshot(q, callback, errorCallback || ((error) => {
        console.error(`Error in snapshot listener for ${path}:`, error);
      }));
    } catch (error) {
      console.error(`Error setting up snapshot listener for ${path}:`, error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Listen to a single document
   */
  onDocumentSnapshot(path, docId, callback, errorCallback = null) {
    try {
      const docRef = this.getDocRef(path, docId);
      return onSnapshot(docRef, callback, errorCallback || ((error) => {
        console.error(`Error in document snapshot listener for ${path}/${docId}:`, error);
      }));
    } catch (error) {
      console.error(`Error setting up document snapshot listener for ${path}/${docId}:`, error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Paginated queries
   */
  async getPaginated(path, options = {}) {
    try {
      const {
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
        pageSize = 10,
        lastDoc = null,
        startFromBeginning = true
      } = options;

      let q = this.getCollectionRef(path);

      // Apply filters
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });

      // Apply ordering
      q = query(q, orderBy(orderByField, orderDirection));

      // Apply pagination
      if (lastDoc && !startFromBeginning) {
        q = query(q, startAfter(lastDoc));
      }

      q = query(q, limit(pageSize));

      const querySnapshot = await getDocs(q);
      const docs = [];
      let lastVisible = null;

      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
        lastVisible = doc;
      });

      return {
        success: true,
        data: docs,
        lastDoc: lastVisible,
        hasMore: docs.length === pageSize
      };
    } catch (error) {
      console.error(`Error in paginated query for ${path}:`, error);
      return {
        success: false,
        error: error.message,
        data: [],
        hasMore: false
      };
    }
  }

  /**
   * Multi-tenant helpers - get business subcollection with pagination
   */
  async getBusinessSubcollection(businessId, subcollectionName, additionalFilters = [], options = {}) {
    const path = this.getBusinessSubcollectionPath(businessId, subcollectionName);
    const filters = [...additionalFilters];

    if (options.paginated) {
      return this.getPaginated(path, { ...options, filters });
    } else {
      return this.getMany(path, filters, options.orderByField, options.orderDirection, options.limit);
    }
  }

  /**
   * Utility functions
   */
  serverTimestamp() {
    return serverTimestamp();
  }

  increment(value = 1) {
    return increment(value);
  }

  arrayUnion(...elements) {
    return arrayUnion(...elements);
  }

  arrayRemove(...elements) {
    return arrayRemove(...elements);
  }

  timestamp(date) {
    return date ? Timestamp.fromDate(date) : Timestamp.now();
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
