// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBroYhy4btJn7NzqWaiw5mj4A-cGh5fbSA",
  authDomain: "ncr-neu.firebaseapp.com",
  projectId: "ncr-neu",
  storageBucket: "ncr-neu.firebasestorage.app",
  messagingSenderId: "39361149369",
  appId: "1:39361149369:web:d65b49c9537802f06cde68",
  measurementId: "G-J1EKSWWGEE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);  // Configura Firestore

// Exporta la configuración para poder usarla en otros archivos
export { db };