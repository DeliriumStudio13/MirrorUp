/**
 * Firebase Storage Service
 * File upload, download, and management operations
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '../config';

class StorageService {
  /**
   * Upload file with progress tracking
   */
  async uploadFile(file, path, options = {}) {
    try {
      const {
        onProgress = null,
        metadata = {},
        overwrite = true
      } = options;

      // Create storage reference
      const storageRef = ref(storage, path);

      // Add default metadata
      const fileMetadata = {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          size: file.size.toString(),
          ...metadata
        }
      };

      let uploadTask;

      if (onProgress) {
        // Use resumable upload for progress tracking
        uploadTask = uploadBytesResumable(storageRef, file, fileMetadata);

        return new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress({
                progress,
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                state: snapshot.state
              });
            },
            (error) => {
              console.error('Upload error:', error);
              reject({
                success: false,
                error: this.handleStorageError(error)
              });
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  success: true,
                  downloadURL,
                  fullPath: uploadTask.snapshot.ref.fullPath,
                  metadata: uploadTask.snapshot.metadata
                });
              } catch (error) {
                reject({
                  success: false,
                  error: this.handleStorageError(error)
                });
              }
            }
          );
        });
      } else {
        // Simple upload without progress tracking
        const snapshot = await uploadBytes(storageRef, file, fileMetadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          success: true,
          downloadURL,
          fullPath: snapshot.ref.fullPath,
          metadata: snapshot.metadata
        };
      }
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: this.handleStorageError(error)
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files, basePath, options = {}) {
    const {
      onProgress = null,
      onFileComplete = null,
      metadata = {}
    } = options;

    const results = [];
    let completed = 0;

    for (const file of files) {
      try {
        const filePath = `${basePath}/${this.generateFileName(file)}`;
        const result = await this.uploadFile(file, filePath, {
          metadata: {
            ...metadata,
            batchUpload: 'true',
            batchIndex: completed.toString()
          },
          onProgress: onProgress ? (progress) => {
            onProgress({
              ...progress,
              fileIndex: completed,
              totalFiles: files.length,
              fileName: file.name
            });
          } : null
        });

        results.push({
          file: file.name,
          ...result
        });

        if (onFileComplete) {
          onFileComplete({
            file: file.name,
            index: completed,
            total: files.length,
            result
          });
        }

        completed++;
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: this.handleStorageError(error)
        });
      }
    }

    return {
      success: results.every(r => r.success),
      results,
      completed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }

  /**
   * Download file URL
   */
  async getDownloadURL(path) {
    try {
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);

      return {
        success: true,
        url
      };
    } catch (error) {
      console.error('Error getting download URL:', error);
      return {
        success: false,
        error: this.handleStorageError(error)
      };
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: this.handleStorageError(error)
      };
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(paths) {
    const results = [];

    for (const path of paths) {
      const result = await this.deleteFile(path);
      results.push({
        path,
        ...result
      });
    }

    return {
      success: results.every(r => r.success),
      results,
      deleted: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path) {
    try {
      const storageRef = ref(storage, path);
      const metadata = await getMetadata(storageRef);

      return {
        success: true,
        metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return {
        success: false,
        error: this.handleStorageError(error)
      };
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(path, metadata) {
    try {
      const storageRef = ref(storage, path);
      const updatedMetadata = await updateMetadata(storageRef, metadata);

      return {
        success: true,
        metadata: updatedMetadata
      };
    } catch (error) {
      console.error('Error updating file metadata:', error);
      return {
        success: false,
        error: this.handleStorageError(error)
      };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path = '') {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);

      const files = [];
      const folders = [];

      // Get file info
      for (const fileRef of result.items) {
        try {
          const [url, metadata] = await Promise.all([
            getDownloadURL(fileRef),
            getMetadata(fileRef)
          ]);

          files.push({
            name: fileRef.name,
            fullPath: fileRef.fullPath,
            url,
            metadata,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated
          });
        } catch (error) {
          console.warn(`Error getting details for file ${fileRef.name}:`, error);
          files.push({
            name: fileRef.name,
            fullPath: fileRef.fullPath,
            error: this.handleStorageError(error)
          });
        }
      }

      // Get folder info
      result.prefixes.forEach(folderRef => {
        folders.push({
          name: folderRef.name,
          fullPath: folderRef.fullPath
        });
      });

      return {
        success: true,
        files,
        folders,
        totalFiles: files.length,
        totalFolders: folders.length
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return {
        success: false,
        error: this.handleStorageError(error),
        files: [],
        folders: []
      };
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(file, includeTimestamp = true) {
    const timestamp = includeTimestamp ? `_${Date.now()}` : '';
    const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}${name}`.replace(/^_/, '');
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file type
   */
  validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (!allowedExtensions.includes(extension)) {
        errors.push(`File extension ".${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle storage errors
   */
  handleStorageError(error) {
    const errorMessages = {
      'storage/object-not-found': 'File not found.',
      'storage/unauthorized': 'Permission denied. Please check your authentication.',
      'storage/canceled': 'Upload was canceled.',
      'storage/unknown': 'An unknown error occurred.',
      'storage/invalid-format': 'Invalid file format.',
      'storage/invalid-event-name': 'Invalid event name provided.',
      'storage/invalid-url': 'Invalid URL provided.',
      'storage/invalid-argument': 'Invalid argument provided.',
      'storage/no-default-bucket': 'No default bucket configured.',
      'storage/cannot-slice-blob': 'Cannot slice file.',
      'storage/server-file-wrong-size': 'File size mismatch.',
      'storage/quota-exceeded': 'Storage quota exceeded.'
    };

    console.error('Storage Error:', error);
    return errorMessages[error.code] || `Storage error: ${error.message}`;
  }

  /**
   * Create storage path helpers
   */
  createPath(...segments) {
    return segments.filter(Boolean).join('/');
  }

  // Predefined path builders for common use cases
  paths = {
    // User profile images
    userAvatar: (userId) => `users/${userId}/avatar`,
    
    // Business assets
    businessLogo: (businessId) => `businesses/${businessId}/logo`,
    businessDocuments: (businessId) => `businesses/${businessId}/documents`,
    
    // Employee documents
    employeeDocuments: (businessId, userId) => `businesses/${businessId}/employees/${userId}/documents`,
    
    // Evaluation attachments
    evaluationFiles: (businessId, evaluationId) => `businesses/${businessId}/evaluations/${evaluationId}/files`,
    
    // General uploads
    uploads: (businessId) => `businesses/${businessId}/uploads`,
    
    // Temporary files
    temp: () => 'temp'
  };
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
