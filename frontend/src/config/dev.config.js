// Development configuration
const devConfig = {
  useEmulators: true,
  firebase: {
    apiKey: "AIzaSyD8ACB8656g7lSdMA5h4nU9bj37hRaMjGQ",
    authDomain: "mirrorup-e71a0.firebaseapp.com",
    projectId: "mirrorup-e71a0",
    storageBucket: "mirrorup-e71a0.firebasestorage.app",
    messagingSenderId: "852717548637",
    appId: "1:852717548637:web:bf2e1aaa2a0615ebbc89b4",
    measurementId: "G-GE20LY3H3H"
  },
  emulators: {
    auth: "http://localhost:9099",
    firestore: "localhost:8080",
    functions: "localhost:5001",
    storage: "localhost:9199"
  }
};

export default devConfig;
