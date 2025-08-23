# Employee Evaluation System

A comprehensive multi-tenant employee evaluation and performance management system built with Firebase and React.

## 🏗️ Architecture

### Backend (Firebase)
- **Firebase Authentication** - Multi-tenant user authentication
- **Cloud Firestore** - NoSQL database with security rules
- **Cloud Functions** - Server-side business logic
- **Cloud Storage** - File uploads and document storage
- **Firebase Hosting** - Static site hosting

### Frontend (React)
- **React 18** with hooks and functional components
- **Redux Toolkit** for state management
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Firebase SDK** for real-time data

## 🚀 Features

### Multi-Tenant Architecture
- **Business Isolation** - Complete data separation between businesses
- **Role-Based Access Control** - Admin, HR, Manager, Employee roles
- **Custom Permissions** - Granular access control per module
- **Scalable Infrastructure** - Built for multiple organizations

### User Management
- **User Registration** - Business setup with admin account
- **Employee Management** - Create, update, deactivate users
- **Organization Chart** - Visual hierarchy and reporting structure
- **Department Management** - Organize users into departments

### Performance Evaluation
- **Flexible Templates** - Customizable evaluation forms
- **Multi-Step Workflow** - Review and approval process
- **Scoring Systems** - Multiple rating scales (1-5, 1-10, A-F, %)
- **Goal Tracking** - Set and monitor employee objectives
- **360-Degree Reviews** - Optional peer feedback

### Bonus Management
- **Distribution Algorithms** - Performance-based, equal, salary-based
- **Department Budgets** - Separate bonus pools per department
- **Simulation Tools** - Preview bonus calculations
- **Approval Workflow** - Admin approval for bonus distributions

### Analytics & Reporting
- **Performance Dashboards** - Real-time metrics and KPIs
- **Trend Analysis** - Historical performance tracking
- **Department Comparisons** - Cross-departmental analytics
- **Export Capabilities** - Generate reports and data exports

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore, Auth, Functions, and Storage enabled

### 1. Clone & Install
```bash
git clone <repository-url>
cd employee-evaluation-system
npm run install:all
```

### 2. Firebase Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase project (if not done)
firebase init

# Deploy security rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 3. Environment Configuration
Update `src/firebase/config.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

### 4. Development
```bash
# Start both frontend and Firebase emulators
npm run dev

# Or start individually
npm run client:dev        # React dev server
npm run functions:serve   # Firebase functions emulator
npm run emulator         # All Firebase emulators
```

### 5. Deploy
```bash
# Build and deploy everything
npm run build
npm run deploy

# Or deploy individually
npm run functions:deploy  # Functions only
firebase deploy --only hosting  # Frontend only
```

## 📂 Project Structure

```
employee-evaluation-system/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # Firebase service classes
│   │   ├── hooks/          # Custom React hooks
│   │   └── firebase/       # Firebase configuration
├── functions/               # Cloud Functions
│   ├── src/
│   │   ├── auth.ts        # Authentication functions
│   │   ├── evaluations.ts # Evaluation functions
│   │   ├── bonus.ts       # Bonus calculation functions
│   │   └── index.ts       # Main exports
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore indexes
├── storage.rules           # Storage security rules
└── firebase.json           # Firebase configuration
```

## 🔒 Security

### Firestore Security Rules
- **Multi-tenant isolation** - Users can only access their business data
- **Role-based permissions** - Different access levels per user role
- **Field-level security** - Granular control over data modification

### Authentication
- **Firebase Auth** - Secure authentication with custom claims
- **Session management** - Automatic token refresh and validation
- **Password policies** - Configurable security requirements

## 📊 Data Models

### Users
```javascript
{
  businessId: "business_id",
  email: "user@company.com",
  profile: {
    firstName: "John",
    lastName: "Doe",
    avatar: "storage_url",
    // ...
  },
  role: "admin|hr|manager|employee",
  employeeInfo: {
    department: "department_id",
    manager: "manager_id",
    position: "Software Engineer",
    // ...
  },
  permissions: [...],
  // ...
}
```

### Evaluations
```javascript
{
  businessId: "business_id",
  employeeId: "user_id",
  evaluatorId: "evaluator_id",
  templateId: "template_id",
  evaluationPeriod: {
    year: 2024,
    type: "annual",
    // ...
  },
  categories: [...],
  overallScore: 85,
  workflow: {
    status: "completed",
    steps: [...],
    // ...
  },
  // ...
}
```

## 🎯 Usage

### 1. Business Registration
1. Visit the registration page
2. Enter business and admin details
3. System creates business and admin user
4. Admin can then invite employees

### 2. Employee Management
1. Admin/HR creates employee accounts
2. Assign to departments and managers
3. Set roles and permissions
4. Build organization chart

### 3. Performance Reviews
1. Admin creates evaluation templates
2. Assign evaluations to employees
3. Managers complete reviews
4. System calculates scores and recommendations

### 4. Bonus Distribution
1. Set department bonus pools
2. Choose distribution method
3. System calculates individual bonuses
4. Admin approves distributions

## 🔧 Development

### Adding New Features
1. **Cloud Functions** - Add server-side logic in `functions/src/`
2. **Frontend Components** - Create React components in `frontend/src/components/`
3. **Services** - Add Firebase service classes in `frontend/src/services/`
4. **Security Rules** - Update Firestore rules for new data access patterns

### Testing
```bash
# Run Firebase emulators for testing
firebase emulators:start

# Run frontend tests
cd frontend && npm test

# Run function tests
cd functions && npm test
```

## 📈 Monitoring

- **Firebase Console** - Monitor authentication, database, and functions
- **Analytics** - Track user engagement and feature usage
- **Performance Monitoring** - Monitor app performance and errors
- **Cloud Logging** - Server-side logging and error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Firebase and React
