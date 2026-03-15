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
const TOKENS_FILE = './password-reset-tokens.json';

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
  { title: 'Computer Systems', author: 'Randal E. Bryant', image: 'https://covers.openlibrary.org/b/isbn/9780134092669-L.jpg', rating: 4.9, info: "Programmer's perspective on computer systems", price: 79.99 },
  { title: 'Artificial Intelligence', author: 'Stuart Russell', image: 'https://covers.openlibrary.org/b/isbn/9780136042594-L.jpg', rating: 4.7, info: 'Modern approach to AI', price: 69.99 },
  { title: 'Database System Concepts', author: 'Abraham Silberschatz', image: 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg', rating: 4.4, info: 'Comprehensive database management coverage', price: 54.99 },
  { title: 'Operating System Concepts', author: 'Abraham Silberschatz', image: 'https://covers.openlibrary.org/b/isbn/9781118063330-L.jpg', rating: 4.3, info: 'Fundamental OS design concepts', price: 64.99 }
];

let passwordResetTokens = {};

function loadTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    passwordResetTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    Object.keys(passwordResetTokens).forEach(token => {
      if (passwordResetTokens[token].expires < Date.now()) {
        delete passwordResetTokens[token];
      }
    });
    saveTokens();
  }
}

function saveTokens() {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(passwordResetTokens, null, 2));
}

loadTokens();

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

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!USE_MYSQL) {
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.json({ message: 'If email exists, reset link sent' });
    }
    const token = uuidv4();
    passwordResetTokens[token] = { email, expires: Date.now() + 3600000 };
    saveTokens();
    console.log(`\n📧 Password Reset Email Sent to: ${email}`);
    console.log(`🔐 Reset Token: ${token}`);
    console.log(`⏰ Expires in: 1 hour\n`);
    return res.json({ message: 'Password reset token generated', token: token });
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
      saveTokens();
      console.log(`\n✅ Password successfully reset for: ${email}\n`);
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
