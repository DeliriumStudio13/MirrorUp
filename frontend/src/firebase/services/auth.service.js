/**
 * Firebase Authentication Service
 * Centralized authentication operations with error handling
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
  deleteUser as deleteFirebaseUser
} from 'firebase/auth';
import { auth } from '../config';

class AuthService {
  /**
   * Sign in user with email and password
   */
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user,
        message: 'Login successful'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error),
        code: error.code
      };
    }
  }

  /**
   * Create new user account
   */
  async createUser(email, password, additionalInfo = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile if additional info provided
      if (additionalInfo.displayName) {
        await updateProfile(userCredential.user, {
          displayName: additionalInfo.displayName,
          photoURL: additionalInfo.photoURL || null
        });
      }

      return {
        success: true,
        user: userCredential.user,
        message: 'Account created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error),
        code: error.code
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      await signOut(auth);
      return {
        success: true,
        message: 'Signed out successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Confirm password reset with code
   */
  async confirmPasswordReset(oobCode, newPassword) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      await updatePassword(user, newPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      await updateProfile(user, profileData);
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteUserAccount() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      await deleteFirebaseUser(user);
      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleAuthError(error)
      };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Handle authentication errors with user-friendly messages
   */
  handleAuthError(error) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-email': 'Invalid email address format.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/operation-not-allowed': 'This operation is not allowed.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/requires-recent-login': 'This operation requires recent authentication. Please sign in again.',
      'auth/invalid-action-code': 'The reset code is invalid or has expired.',
      'auth/expired-action-code': 'The reset code has expired.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign in was cancelled.',
      'auth/popup-blocked': 'Sign in popup was blocked by the browser.',
      'auth/invalid-credential': 'Invalid login credentials.',
      'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
      'auth/credential-already-in-use': 'This credential is already associated with another account.',
      'auth/unauthorized-domain': 'This domain is not authorized for authentication.',
      'auth/missing-email': 'Email address is required.',
      'auth/internal-error': 'An internal error occurred. Please try again.'
    };

    console.error('Auth Error:', error);
    return errorMessages[error.code] || `Authentication error: ${error.message}`;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!auth.currentUser;
  }

  /**
   * Get ID token for authenticated requests
   */
  async getIdToken(forceRefresh = false) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Error getting ID token:', error);
      throw error;
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
