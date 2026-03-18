const API_URL = 'https://online-bookstore-f4j1.onrender.com/api';

const BOOK_CATEGORIES = {
  'Clean Code': 'Programming',
  'Introduction to Algorithms': 'Programming',
  'The Pragmatic Programmer': 'Programming',
  'Design Patterns': 'Programming',
  'Computer Systems': 'Programming',
  'Artificial Intelligence': 'Programming',
  'Database System Concepts': 'Programming',
  'Operating System Concepts': 'Programming',
  'The Great Gatsby': 'Fiction',
  'To Kill a Mockingbird': 'Fiction',
  '1984': 'Fiction',
  'Pride and Prejudice': 'Fiction',
  'The Catcher in the Rye': 'Fiction',
  'Sapiens': 'Non-Fiction',
  'Atomic Habits': 'Non-Fiction',
  'The Power of Now': 'Non-Fiction',
  'A Brief History of Time': 'Non-Fiction',
  'Educated': 'Non-Fiction'
};

function assignCategory(book) {
  if (book.category) return book;
  return { ...book, category: BOOK_CATEGORIES[book.title] || 'Programming' };
}

let currentUser = null;
let token = localStorage.getItem('bookstore_token');
let allBooks = [];
let books = [];
let cartItems = [];

async function init() {
  loadUserFromStorage();
  await loadCategories();
  await loadBooks();
  setupEventListeners();
}

async function loadCategories() {
  const select = document.getElementById('category_select');
  const defaultCategories = ['All', 'Programming', 'Fiction', 'Non-Fiction'];
  
  select.innerHTML = defaultCategories.map(cat => 
    `<option value="${cat}">${cat}</option>`
  ).join('');
  
  select.addEventListener('change', (e) => {
    loadBooks(e.target.value);
  });
}

async function loadBooks(category = 'All') {
  try {
    const response = await fetch(`${API_URL}/books`);
    const rawBooks = await response.json();
    allBooks = rawBooks.map(assignCategory);
    if (category && category !== 'All') {
      books = allBooks.filter(b => b.category === category);
    } else {
      books = allBooks;
    }
    renderBooks(books);
  } catch (error) {
    console.error('Failed to load books:', error);
  }
}

function loadUserFromStorage() {
  const savedUser = localStorage.getItem('bookstore_user');
  const savedToken = localStorage.getItem('bookstore_token');
  if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    token = savedToken;
    updateAuthUI();
    renderBooks(books);
    loadCart();
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('search_book');
  searchInput.addEventListener('input', handleSearch);

  const authBtn = document.getElementById('auth_btn');
  authBtn.addEventListener('click', () => {
    if (currentUser) {
      logout();
    } else {
      openModal();
    }
  });

  const modal = document.getElementById('auth_modal');
  const closeBtn = document.querySelector('.close');
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const authForm = document.getElementById('auth_form');
  authForm.addEventListener('submit', handleAuth);

  const toggleAuth = document.getElementById('toggle_auth');
  toggleAuth.addEventListener('click', toggleAuthMode);

  const forgotPassword = document.getElementById('forgot_password');
  forgotPassword.addEventListener('click', openForgotModal);

  const cartBtn = document.getElementById('cart_btn');
  cartBtn.addEventListener('click', openCartModal);

  const closeCart = document.querySelector('.close-cart');
  closeCart.addEventListener('click', closeCartModal);

  const cartModal = document.getElementById('cart_modal');
  cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) closeCartModal();
  });

  const checkoutBtn = document.getElementById('checkout_btn');
  checkoutBtn.addEventListener('click', handleCheckout);

  const forgotModal = document.getElementById('forgot_modal');
  const closeForgot = document.querySelector('.close-forgot');
  closeForgot.addEventListener('click', closeForgotModal);
  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) closeForgotModal();
  });

  const forgotForm = document.getElementById('forgot_form');
  forgotForm.addEventListener('submit', handleForgotPassword);

  const resetModal = document.getElementById('reset_modal');
  const closeReset = document.querySelector('.close-reset');
  closeReset.addEventListener('click', () => {
    resetModal.style.display = 'none';
  });
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) resetModal.style.display = 'none';
  });

  const resetForm = document.getElementById('reset_form');
  resetForm.addEventListener('submit', handleResetPassword);

  const successModal = document.getElementById('order_success_modal');
  const closeSuccess = document.querySelector('.close-success');
  closeSuccess.addEventListener('click', () => {
    successModal.style.display = 'none';
  });
}

function renderBooks(booksToRender) {
  const container = document.getElementById('books_container');
  const colors = ['#cbb5e2', '#fbadaf', '#a4e0eb', '#fdca95'];
  
  container.innerHTML = booksToRender.map((book, index) => `
    <div class="books" style="background-color: ${colors[index % colors.length]}">
      <div>
        <img src="${book.image}" alt="${book.title}" class="book-img">
      </div>
      <div class="descp">
        <span class="category-tag">${book.category || ''}</span>
        <h2 class="book-name">${book.title}</h2>
        <h3 class="author">by ${book.author}</h3>
        <h3 class="rating">${Number(book.rating).toFixed(1)} rating</h3>
        <p class="info">${book.info}</p>
        <p class="price">$${Number(book.price).toFixed(2)}</p>
        <button type="button" class="add-to-cart" data-id="${book.id}">
          ${currentUser ? 'Add to Cart' : 'Login to Buy'}
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookId = e.target.dataset.id;
      if (currentUser) {
        addToCart(bookId);
      } else {
        openModal();
      }
    });
  });
}

function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  const category = document.getElementById('category_select').value;
  let filteredBooks = allBooks;
  if (category && category !== 'All') {
    filteredBooks = allBooks.filter(b => b.category === category);
  }
  if (searchTerm) {
    filteredBooks = filteredBooks.filter(book => 
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm)
    );
  }
  renderBooks(filteredBooks);
}

function openModal() {
  document.getElementById('auth_modal').style.display = 'flex';
  document.getElementById('auth_title').textContent = 'Login';
  document.getElementById('submit_btn').textContent = 'Login';
  document.getElementById('toggle_auth').textContent = "Don't have an account? Register";
  document.querySelector('.confirm-pass').style.display = 'none';
}

function closeModal() {
  document.getElementById('auth_modal').style.display = 'none';
  document.getElementById('auth_form').reset();
  document.getElementById('auth_error').textContent = '';
}

function toggleAuthMode() {
  const isLogin = document.getElementById('toggle_auth').textContent === "Don't have an account? Register";
  document.getElementById('auth_title').textContent = isLogin ? 'Register' : 'Login';
  document.getElementById('submit_btn').textContent = isLogin ? 'Register' : 'Login';
  document.getElementById('toggle_auth').textContent = isLogin ? 'Already have an account? Login' : "Don't have an account? Register";
  document.querySelector('.confirm-pass').style.display = isLogin ? 'block' : 'none';
  document.getElementById('auth_error').textContent = '';
  
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  emailInput.value = '';
  passwordInput.value = '';
  const confirmInput = document.getElementById('confirm_password');
  if (confirmInput) confirmInput.value = '';
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const isLogin = document.getElementById('submit_btn').textContent === 'Login';

  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }

  if (!validateEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (!isLogin) {
    const confirmPassword = document.getElementById('confirm_password').value.trim();
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
  }

  const endpoint = isLogin ? '/auth/login' : '/auth/register';
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error);
      return;
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('bookstore_token', token);
    localStorage.setItem('bookstore_user', JSON.stringify(currentUser));
    updateAuthUI();
    renderBooks(books);
    loadCart();
    closeModal();
    renderBooks(books);
    loadCart();
  } catch (error) {
    showError('Network error. Please try again.');
  }
}

function showError(message) {
  document.getElementById('auth_error').textContent = message;
}

function logout() {
  currentUser = null;
  token = null;
  cartItems = [];
  localStorage.removeItem('bookstore_token');
  localStorage.removeItem('bookstore_user');
  updateAuthUI();
  renderBooks(books);
  document.getElementById('cart_count').textContent = '0';
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth_btn');
  const userEmail = document.getElementById('user_email');
  const cartBtn = document.getElementById('cart_btn');
  
  if (currentUser) {
    authBtn.textContent = 'Logout';
    userEmail.textContent = currentUser.email;
    userEmail.style.display = 'block';
    cartBtn.style.display = 'flex';
  } else {
    authBtn.textContent = 'Login';
    userEmail.style.display = 'none';
    cartBtn.style.display = 'none';
  }
}

async function loadCart() {
  if (!token) return;
  
  try {
    const response = await fetch(`${API_URL}/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    cartItems = await response.json();
    updateCartCount();
  } catch (error) {
    console.error('Failed to load cart:', error);
  }
}

function updateCartCount() {
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart_count').textContent = count;
}

async function addToCart(bookId) {
  try {
    const response = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ bookId, quantity: 1 })
    });

    if (response.ok) {
      await loadCart();
    }
  } catch (error) {
    console.error('Failed to add to cart:', error);
  }
}

function openCartModal() {
  renderCartItems();
  document.getElementById('cart_modal').style.display = 'flex';
}

function closeCartModal() {
  document.getElementById('cart_modal').style.display = 'none';
}

function renderCartItems() {
  const container = document.getElementById('cart_items');
  
  if (cartItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 20px;">Your cart is empty</p>';
    document.getElementById('cart_total').textContent = '0.00';
    return;
  }

  container.innerHTML = cartItems.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.title}" class="cart-item-img">
      <div class="cart-item-info">
        <h4>${item.title}</h4>
        <p>$${Number(item.price).toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
        <button onclick="removeFromCart('${item.id}')" class="remove-btn">Remove</button>
      </div>
    </div>
  `).join('');

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cart_total').textContent = total.toFixed(2);
}

async function updateQuantity(cartId, quantity) {
  try {
    if (quantity <= 0) {
      await removeFromCart(cartId);
      return;
    }

    await fetch(`${API_URL}/cart/${cartId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    });

    await loadCart();
    renderCartItems();
  } catch (error) {
    console.error('Failed to update quantity:', error);
  }
}

async function removeFromCart(cartId) {
  try {
    await fetch(`${API_URL}/cart/${cartId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    await loadCart();
    renderCartItems();
  } catch (error) {
    console.error('Failed to remove from cart:', error);
  }
}

async function handleCheckout() {
  if (cartItems.length === 0) {
    alert('Your cart is empty');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (response.ok) {
      closeCartModal();
      document.getElementById('order_id').textContent = data.orderId;
      document.getElementById('order_total').textContent = data.totalAmount.toFixed(2);
      document.getElementById('order_success_modal').style.display = 'flex';
      await loadCart();
    } else {
      alert(data.error || 'Checkout failed');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Checkout failed. Please try again.');
  }
}

function openForgotModal() {
  closeModal();
  document.getElementById('forgot_modal').style.display = 'flex';
}

function closeForgotModal() {
  document.getElementById('forgot_modal').style.display = 'none';
  document.getElementById('forgot_form').reset();
  document.getElementById('forgot_error').textContent = '';
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot_email').value.trim();

  if (!validateEmail(email)) {
    document.getElementById('forgot_error').textContent = 'Please enter a valid email';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`✅ Token generated!\n\nEmail: ${email}\nToken: ${data.token}\n\n(Copy this token and use it to reset password)`);
      document.getElementById('display_token').textContent = data.token || 'N/A';
      document.getElementById('forgot_modal').style.display = 'none';
      document.getElementById('reset_modal').style.display = 'flex';
      document.getElementById('reset_form').dataset.email = email;
    } else {
      document.getElementById('forgot_error').textContent = data.error;
    }
  } catch (error) {
    document.getElementById('forgot_error').textContent = 'Network error. Please try again.';
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const email = document.getElementById('reset_form').dataset.email;
  const token = document.getElementById('reset_token').value.trim();
  const newPassword = document.getElementById('new_password').value.trim();

  if (!token || !newPassword) {
    document.getElementById('reset_error').textContent = 'Please fill all fields';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Password reset successful! Please login.');
      document.getElementById('reset_modal').style.display = 'none';
      openModal();
    } else {
      document.getElementById('reset_error').textContent = data.error;
    }
  } catch (error) {
    document.getElementById('reset_error').textContent = 'Network error. Please try again.';
  }
}

document.addEventListener('DOMContentLoaded', init);
