// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics"
import { initializeApp } from "firebase/app"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDnGTgI9h9XszAeQUapmzQs9bMe-9MDc1s",
  authDomain: "supplies-389809.firebaseapp.com",
  projectId: "supplies-389809",
  storageBucket: "supplies-389809.firebasestorage.app",
  messagingSenderId: "944221345030",
  appId: "1:944221345030:web:1e07384f2f70de6c293a87",
  measurementId: "G-ZCWXZKGJMB",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

// Export Firebase app and analytics instances
export { analytics, app }
export default app

