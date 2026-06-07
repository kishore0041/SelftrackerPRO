import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD9j62maJiM7sicISy-uR64nViDbHup9oM",
    authDomain: "selftrackerpro-aa200.firebaseapp.com",
    projectId: "selftrackerpro-aa200",
    storageBucket: "selftrackerpro-aa200.firebasestorage.app",
    messagingSenderId: "195563192837",
    appId: "1:195563192837:web:5817b90a2f83a55d11526c",
    measurementId: "G-2EEWRS86VG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

window.db = db;

console.log("Firebase Connected");