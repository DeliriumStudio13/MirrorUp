/**
 * Firebase Services Export
 * Centralized export for all Firebase services
 */

// Import services
import authService from './auth.service';
import databaseService from './database.service';
import storageService from './storage.service';
import functionsService from './functions.service';

// Export individual services
export { authService, databaseService, storageService, functionsService };

// Export as default object for convenience
export default {
  auth: authService,
  db: databaseService,
  storage: storageService,
  functions: functionsService
};

// Re-export Firebase SDK instances for direct access when needed
export { 
  auth, 
  db, 
  storage, 
  functions, 
  analytics 
} from '../config';
