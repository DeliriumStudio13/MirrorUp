"use strict";
/**
 * Cloud Functions for MirrorUp Employee Evaluation System
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.departmentDeleteDepartment = exports.departmentCreateDepartment = exports.userDeleteUser = exports.userCreateUser = exports.authCreateBusinessAndAdmin = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
// Import auth functions
const auth_1 = require("./auth");
// Import user management functions
const users_1 = require("./users");
// Import department management functions
const departments_1 = require("./departments");
// Export auth functions with hyphenated names to match frontend calls
exports.authCreateBusinessAndAdmin = auth_1.createBusinessAndAdmin;
// Export user management functions
exports.userCreateUser = users_1.createUser;
exports.userDeleteUser = users_1.deleteUser;
// Export department management functions
exports.departmentCreateDepartment = departments_1.createDepartment;
exports.departmentDeleteDepartment = departments_1.deleteDepartment;
// Health check function
exports.healthCheck = (0, https_1.onRequest)({ cors: true }, (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: admin.firestore.Timestamp.now(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production'
    });
});
//# sourceMappingURL=index.js.map