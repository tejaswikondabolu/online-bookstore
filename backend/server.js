require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const USE_MYSQL = process.env.DB_HOST && process.env.DB_HOST !== 'localhost';
const DATA_FILE = './data.json';

app.use(cors());
app.use(express.json());

let db = {
  users: [],
  books: [],
  cart: [],
  orders: []
};

const defaultBooks = [
  { title: 'Clean Code', author: 'Robert C. Martin', image: 'https://m.media-amazon.com/images/I/41jEbK-jG+L.jpg', rating: 4.7, info: 'A handbook of agile software craftsmanship', price: 29.99 },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', image: 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg', rating: 4.8, info: 'Comprehensive textbook on algorithms', price: 89.99 },
  { title: 'The Pragmatic Programmer', author: 'David Thomas', image: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg', rating: 4.6, info: 'Guide to becoming a better programmer', price: 34.99 },
  { title: 'Design Patterns', author: 'Erich Gamma', image: 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg', rating: 4.5, info: 'Object-oriented software design solutions', price: 44.99 },
  { title: 'Computer Systems', author: 'Randal E. Bryant', image: 'https://covers.openlibrary.org/b/isbn/9780134092669-L.jpg', rating: 4.9, info: 'Programmer\'s perspective on computer systems', price: 79.99 },
  { title: 'Artificial Intelligence', author: 'Stuart Russell', image: 'https://covers.openlibrary.org/b/isbn/9780136042594-L.jpg', rating: 4.7, info: 'Modern approach to AI', price: 69.99 },
  { title: 'Database System Concepts', author: 'Abraham Silberschatz', image: 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg', rating: 4.4, info: 'Comprehensive database management coverage', price: 54.99 },
  { title: 'Operating System Concepts', author: 'Abraham Silberschatz', image: 'https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg', rating: 4.3, info: 'Fundamental OS design concepts', price: 64.99 }
];

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } else {
    db.books = defaultBooks.map(b => ({ id: uuidv4(), ...b }));
    saveData();
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

if (!USE_MYSQL) {
  loadData();
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'bookstore_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!USE_MYSQL) {
      if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: uuidv4(), email, password: hashedPassword };
      db.users.push(user);
      saveData();
      const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || 'bookstore_secret_key', { expiresIn: '24h' });
      return res.json({ token, user: { id: user.id, email } });
    }
    res.json({ message: 'MySQL version not implemented - use local mode' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!USE_MYSQL) {
      const user = db.users.find(u => u.email === email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'bookstore_secret_key', { expiresIn: '24h' });
      return res.json({ token, user: { id: user.id, email: user.email } });
    }
    res.json({ message: 'MySQL version not implemented - use local mode' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/books', (req, res) => {
  if (!USE_MYSQL) return res.json(db.books);
  res.json({ message: 'MySQL mode - use local JSON' });
});

app.get('/api/books/:id', (req, res) => {
  if (!USE_MYSQL) {
    const book = db.books.find(b => b.id === req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    return res.json(book);
  }
  res.json({ error: 'MySQL mode' });
});

app.get('/api/cart', authenticateToken, (req, res) => {
  if (!USE_MYSQL) {
    const items = db.cart.filter(c => c.userId === req.user.id).map(c => {
      const book = db.books.find(b => b.id === c.bookId);
      return { ...c, title: book?.title, author: book?.author, image: book?.image, price: book?.price };
    });
    return res.json(items);
  }
  res.json({ error: 'MySQL mode' });
});

app.post('/api/cart', authenticateToken, (req, res) => {
  const { bookId, quantity = 1 } = req.body;
  if (!USE_MYSQL) {
    const existing = db.cart.find(c => c.userId === req.user.id && c.bookId === bookId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      db.cart.push({ id: uuidv4(), userId: req.user.id, bookId, quantity });
    }
    saveData();
    return res.json({ message: 'Added to cart' });
  }
  res.json({ error: 'MySQL mode' });
});

app.put('/api/cart/:id', authenticateToken, (req, res) => {
  const { quantity } = req.body;
  if (!USE_MYSQL) {
    const item = db.cart.find(c => c.id === req.params.id && c.userId === req.user.id);
    if (!item) return res.status(404).json({ error: 'Cart item not found' });
    if (quantity <= 0) {
      db.cart = db.cart.filter(c => c.id !== req.params.id);
    } else {
      item.quantity = quantity;
    }
    saveData();
    return res.json({ message: 'Cart updated' });
  }
  res.json({ error: 'MySQL mode' });
});

app.delete('/api/cart/:id', authenticateToken, (req, res) => {
  if (!USE_MYSQL) {
    db.cart = db.cart.filter(c => c.id !== req.params.id || c.userId !== req.user.id);
    saveData();
    return res.json({ message: 'Item removed from cart' });
  }
  res.json({ error: 'MySQL mode' });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  if (!USE_MYSQL) {
    const cartItems = db.cart.filter(c => c.userId === req.user.id);
    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    
    let totalAmount = 0;
    const orderItems = cartItems.map(c => {
      const book = db.books.find(b => b.id === c.bookId);
      totalAmount += (book?.price || 0) * c.quantity;
      return { bookId: c.bookId, quantity: c.quantity, price: book?.price };
    });

    const order = { id: uuidv4(), userId: req.user.id, totalAmount, status: 'completed', items: orderItems, createdAt: new Date() };
    db.orders.push(order);
    db.cart = db.cart.filter(c => c.userId !== req.user.id);
    saveData();
    
    return res.json({ orderId: order.id, totalAmount, message: 'Order placed successfully' });
  }
  res.json({ error: 'MySQL mode' });
});

app.get('/api/orders', authenticateToken, (req, res) => {
  if (!USE_MYSQL) {
    const orders = db.orders.filter(o => o.userId === req.user.id).map(o => ({ id: o.id, total_amount: o.totalAmount, status: o.status, created_at: o.createdAt, items: o.items }));
    return res.json(orders);
  }
  res.json({ error: 'MySQL mode' });
});

let passwordResetTokens = {};

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!USE_MYSQL) {
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.json({ message: 'If email exists, reset link sent' });
    }
    const token = uuidv4();
    passwordResetTokens[token] = { email, expires: Date.now() + 3600000 };
    console.log(`🔐 Password Reset Token for ${email}: ${token}`);
    return res.json({ message: 'Password reset token generated (check server console)' });
  }
  res.json({ error: 'MySQL mode' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!USE_MYSQL) {
    const resetData = passwordResetTokens[token];
    if (!resetData || resetData.email !== email || resetData.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const user = db.users.find(u => u.email === email);
    if (user) {
      user.password = await bcrypt.hash(newPassword, 10);
      saveData();
      delete passwordResetTokens[token];
      return res.json({ message: 'Password reset successful' });
    }
    return res.status(400).json({ error: 'User not found' });
  }
  res.json({ error: 'MySQL mode' });
});

app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  mode: USE_MYSQL ? 'MySQL' : 'JSON'
}));

app.listen(PORT, () => console.log(`Server running on port ${PORT} (${USE_MYSQL ? 'MySQL' : 'JSON'} mode)`));
