  // Firebase module
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

  //  my config code
const firebaseConfig = {
  apiKey: "AIzaSyBqq0LifmRi_gNCJOZiIExbMZPkedQlais",
  authDomain: "configur-2753c.firebaseapp.com",
  projectId: "configur-2753c",
  storageBucket: "configur-2753c.firebasestorage.app",
  messagingSenderId: "451318454719",
  appId: "1:451318454719:web:78e13ae6a86fc08ed4a90a"
};

  // initialize Firebase
  const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);
