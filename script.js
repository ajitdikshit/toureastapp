// Import Firebase modules once at the top
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Your web app's Firebase configuration (provided by you)
const firebaseConfig = {
  apiKey: "AIzaSyAdTcCMT_0c1uyO1ZAAl_vwLI7Hd6eHIIU",
  authDomain: "toureast-c1b24.firebaseapp.com",
  projectId: "toureast-c1b24",
  storageBucket: "toureast-c1b24.firebasestorage.app",
  messagingSenderId: "381454659894",
  appId: "1:381454659894:web:afd487ddc2263cffd2c397",
  measurementId: "G-VRRE13LB3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Specify the correct database URL for your region
const databaseURL = "https://toureast-c1b24-default-rtdb.asia-southeast1.firebasedatabase.app";
const db = getDatabase(app, databaseURL);

// DOM references
const postForm = document.getElementById('postForm');
const postsContainer = document.getElementById('postsContainer');

// Handle posting new review
postForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('nameInput').value.trim() || 'Anonymous';
  const experience = document.getElementById('experienceInput').value.trim();

  if (experience.length > 0) {
    const postRef = ref(db, 'posts');
    // Add new post (push generates unique key)
    push(postRef, {
      name: name,
      experience: experience,
      time: Date.now()
    });
    postForm.reset();
  }
});

// Render posts in real-time
function renderPosts(postsArray) {
  postsContainer.innerHTML = '';
  postsArray.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const author = document.createElement('div');
    author.className = 'post-author';
    author.textContent = post.name;

    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = post.experience;

    card.appendChild(author);
    card.appendChild(content);
    postsContainer.appendChild(card);
  });
}

// Listen for new posts and update view
const postsRef = ref(db, 'posts');
onValue(postsRef, (snapshot) => {
  const postsObject = snapshot.val();
  // Convert object to sorted array (latest first)
  const postsArray = postsObject ? Object.values(postsObject).sort((a,b)=>b.time-a.time) : [];
  renderPosts(postsArray);
});
