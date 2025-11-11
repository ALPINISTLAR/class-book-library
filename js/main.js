import { db } from './firebase.js';
import { serverTimestamp, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// genres array
const genres = ["Fantasy", "Detective", "Novel", "Scientific", "Classic", "Children", "Adventure", "Romance", "Political Fiction", "Drama", "Historical", "Thriller"];

// DOM elements
const booksContainer = document.getElementById('booksContainer');
const modal = document.getElementById('bookModal');
const modalTitle = document.getElementById('modalTitle');
const bookForm = document.getElementById('bookForm');
const addBookBtn = document.getElementById('addBookBtn');
const cancelBtn = document.getElementById('cancelBtn');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const ratingFilter = document.getElementById('ratingFilter');
const exportCsv = document.getElementById('exportCsv');
const FIRESTORE_COLLECTION = "books";
let books = [];
let editingId = null;

const booksCollection = collection(db, FIRESTORE_COLLECTION);
const spinner = document.getElementById('spinner');

function showSpinner() { spinner.style.display = 'block'; }
function hideSpinner() { spinner.style.display = 'none'; }

showSpinner();

// real-time listener
onSnapshot(booksCollection, (snapshot) => {
  books = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log("Books from Firestore:", books);
  renderBooks(getFilters());
  hideSpinner();
});

// populate genres
function populateGenres() {
  const selects = [document.getElementById('genre'), genreFilter];
  selects.forEach(select => {
    select.innerHTML = '<option value="">All Genres</option>';
    genres.forEach(g => {
      select.innerHTML += `<option value="${g}">${g}</option>`;
    });
  });
}

// create book card
function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.id = book.id;
  const coverStyle = book.coverUrl ? `background-image: url(${book.coverUrl})` : '';
  card.innerHTML = `
    <div class="book-cover" style="${coverStyle}"></div>
    <div class="book-info">
      <div class="book-title">${book.title}</div>
      <div class="book-author"><span>Author: </span>${book.author}</div>
      <div class="book-genre"><span>Genre: </span>${book.genre}</div>
      <div class="rating">${'⭐'.repeat(book.rating)}</div>
      ${book.review ? `<div class="review"><span>Review: </span><br/>${book.review}</div>` : ''}
      ${book.dateFinished ? `<div class="date">Date finished: ${formatDate(book.dateFinished)}</div>` : ''}
      <div class="actions">
        <button class="btn-small btn-edit">Edit</button>
        <button class="btn-small btn-delete">Delete</button>
      </div>
      <div class="timestamp">Date added: ${book.timestamp ? book.timestamp.toDate().toLocaleString() : "N/A"}</div>
    </div>
  `;

  card.querySelector('.btn-edit').addEventListener('click', () => editBook(book.id));
  card.querySelector('.btn-delete').addEventListener('click', () => deleteBook(book.id));
  return card;
}

// render books
function renderBooks(filter = {}) {
  booksContainer.innerHTML = '';
  let filtered = books;

  if (filter.search) {
    const term = filter.search.toLowerCase();
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term)
    );
  }

  if (filter.genre) filtered = filtered.filter(b => b.genre === filter.genre);
  if (filter.rating4plus) filtered = filtered.filter(b => b.rating >= 4);

  if (filtered.length === 0) {
    booksContainer.innerHTML = '<div class="no-books">No books matching your search result</div>'
  } else {
    filtered.forEach(book => booksContainer.appendChild(createBookCard(book)));
  }

  updateStats();
}

// Stats
function updateStats() {
  const totalEl = document.getElementById('totalBooks');
  if (totalEl) totalEl.textContent = books.length;

  const favEl = document.getElementById('favGenre');
  if (favEl) {
    const genreCount = {};
    books.forEach(b => { genreCount[b.genre] = (genreCount[b.genre] || 0) + 1; });
    const fav = Object.keys(genreCount).length ? Object.keys(genreCount).reduce((a, b) => genreCount[a] > genreCount[b] ? a : b) : '-';
    favEl.textContent = fav;
  }
}

// open modal
function openModal(book = null) {
  editingId = book ? book.id : null;
  modalTitle.textContent = book ? 'Editing book' : 'Add new book';

  document.getElementById('title').value = book?.title || '';
  document.getElementById('author').value = book?.author || '';
  document.getElementById('genre').value = book?.genre || '';
  document.getElementById('review').value = book?.review || '';
  document.getElementById('dateFinished').value = book?.dateFinished || '';

  const stars = document.querySelectorAll('#ratingStars i');
  stars.forEach((star, i) => star.classList.toggle('active', book && i < book.rating));

  modal.style.display = 'flex';
}

// close modal
function closeModal() {
  modal.style.display = 'none';
  bookForm.reset();
  editingId = null;

  ['title', 'author', 'genre', 'rating', 'review', 'dateFinished'].forEach(key => {
    const errorEl = document.getElementById(key + 'Error');
    if (errorEl) errorEl.textContent = '';
  });
}

// Save book
bookForm.addEventListener('submit', async e => {
  e.preventDefault();

  const fields = {
    title: document.getElementById('title').value.trim(),
    author: document.getElementById('author').value.trim(),
    genre: document.getElementById('genre').value,
    rating: document.querySelectorAll('#ratingStars i.active').length,
    review: document.getElementById('review').value.trim(),
    dateFinished: document.getElementById('dateFinished').value,
  };

  const alphaRegex = /^[A-Za-z.,\s]+$/;
  let hasError = false;

  Object.keys(fields).forEach(key => {
    const errorEl = document.getElementById(key + 'Error');
    if (!errorEl) return; // element bo'lmasa o'tkazish
    errorEl.textContent = '';

    if (key === 'rating' && fields[key] === 0) {
      errorEl.textContent = 'Please select a rating.';
      hasError = true;
      return;
    }

    if ((key === 'title' || key === 'author' || key === 'review') && fields[key]) {
      const valToCheck = key === 'review' ? fields[key].replace(/\s/g, '') : fields[key];
      if (!alphaRegex.test(valToCheck)) {
        errorEl.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} must contain letters only.`;
        hasError = true;
        return;
      }
    }

    if (!fields[key]) {
      errorEl.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} is required.`;
      hasError = true;
    }
  });

  if (hasError) return;

  const bookData = { ...fields, timestamp: serverTimestamp() };

  try {
    if (editingId) {
      const bookRef = doc(db, FIRESTORE_COLLECTION, editingId);
      await updateDoc(bookRef, bookData);
      console.log("Book updated:", fields.title);
    } else {
      await addDoc(booksCollection, bookData);
      console.log("Book added:", fields.title);
    }
    closeModal();
  } catch (error) {
    console.error("Error saving book:", error);
  }
});

// rating stars
document.querySelectorAll('#ratingStars i').forEach(star => {
  star.addEventListener('click', () => {
    const value = star.dataset.value;
    const stars = document.querySelectorAll('#ratingStars i');
    stars.forEach((s, i) => s.classList.toggle('active', i < value));
  });
});

// delete book
const confirmModal = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
let deleteId = null;

function deleteBook(id) {
  deleteId = id;
  confirmModal.style.display = 'flex';
}

confirmYes.addEventListener('click', async () => {
  if (!deleteId) return;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTION, deleteId));
    console.log("Book deleted:", deleteId);
  } catch (error) {
    console.error("Error deleting book:", error);
  }
  deleteId = null;
  confirmModal.style.display = 'none';
});

confirmNo.addEventListener('click', () => {
  deleteId = null;
  confirmModal.style.display = 'none';
});

// edit
function editBook(id) {
  const book = books.find(b => b.id === id);
  openModal(book);
}

// filters
function getFilters() {
  return {
    search: searchInput.value,
    genre: genreFilter.value,
    rating4plus: ratingFilter.checked
  };
}

searchInput.addEventListener('input', () => renderBooks(getFilters()));
genreFilter.addEventListener('change', () => renderBooks(getFilters()));
ratingFilter.addEventListener('change', () => renderBooks(getFilters()));

// format date
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ');
}

// CSV export
exportCsv.addEventListener('click', () => {
  if (!books || books.length === 0) {
    alert("No books to export!");
    return;
  }

  const headers = ["Title", "Author", "Genre", "Rating", "Review", "Date Finished"];
  const csvRows = [headers.join(",")];

  books.forEach(book => {
    const row = [
      `"${book.title}"`,
      `"${book.author}"`,
      `"${book.genre}"`,
      `"${book.rating}"`,
      `"${book.review}"`,
      `"${book.dateFinished}"`
    ];
    csvRows.push(row.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'books.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// initialize
populateGenres();
addBookBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
