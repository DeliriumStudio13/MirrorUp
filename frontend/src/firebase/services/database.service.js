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
  getDocRef(collectionName, docId) {
    return doc(db, collectionName, docId);
  }

  /**
   * Get a collection reference
   */
  getCollectionRef(collectionName) {
    return collection(db, collectionName);
  }

  /**
   * Create a new document
   */
  async create(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
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
      console.error(`Error creating document in ${collectionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a document with specific ID
   */
  async createWithId(collectionName, docId, data) {
    try {
      await setDoc(doc(db, collectionName, docId), {
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
      console.error(`Error creating document ${docId} in ${collectionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a single document
   */
  async getById(collectionName, docId) {
    try {
      const docSnap = await getDoc(doc(db, collectionName, docId));

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
      console.error(`Error getting document ${docId} from ${collectionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get multiple documents with optional filters
   */
  async getMany(collectionName, filters = [], orderByField = null, orderDirection = 'asc', limitCount = null) {
    try {
      let q = collection(db, collectionName);

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
      console.error(`Error getting documents from ${collectionName}:`, error);
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
  async update(collectionName, docId, data) {
    try {
      await updateDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Document updated successfully'
      };
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a document
   */
  async delete(collectionName, docId) {
    try {
      await deleteDoc(doc(db, collectionName, docId));

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Soft delete a document (mark as inactive)
   */
  async softDelete(collectionName, docId) {
    return this.update(collectionName, docId, { 
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
        const { type, collection: collectionName, id, data } = operation;
        const docRef = doc(db, collectionName, id);

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
  onSnapshot(collectionName, filters = [], callback, errorCallback = null) {
    try {
      let q = collection(db, collectionName);

      // Apply filters
      if (filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }

      return onSnapshot(q, callback, errorCallback || ((error) => {
        console.error(`Error in snapshot listener for ${collectionName}:`, error);
      }));
    } catch (error) {
      console.error(`Error setting up snapshot listener for ${collectionName}:`, error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Listen to a single document
   */
  onDocumentSnapshot(collectionName, docId, callback, errorCallback = null) {
    try {
      const docRef = doc(db, collectionName, docId);
      return onSnapshot(docRef, callback, errorCallback || ((error) => {
        console.error(`Error in document snapshot listener for ${collectionName}/${docId}:`, error);
      }));
    } catch (error) {
      console.error(`Error setting up document snapshot listener for ${collectionName}/${docId}:`, error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Paginated queries
   */
  async getPaginated(collectionName, options = {}) {
    try {
      const {
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
        pageSize = 10,
        lastDoc = null,
        startFromBeginning = true
      } = options;

      let q = collection(db, collectionName);

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
      console.error(`Error in paginated query for ${collectionName}:`, error);
      return {
        success: false,
        error: error.message,
        data: [],
        hasMore: false
      };
    }
  }

  /**
   * Multi-tenant helpers - filter by business ID
   */
  async getByBusiness(collectionName, businessId, additionalFilters = [], options = {}) {
    const filters = [
      { field: 'businessId', operator: '==', value: businessId },
      ...additionalFilters
    ];

    if (options.paginated) {
      return this.getPaginated(collectionName, { ...options, filters });
    } else {
      return this.getMany(collectionName, filters, options.orderByField, options.orderDirection, options.limit);
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
