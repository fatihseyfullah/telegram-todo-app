const express = require('express');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlantı hatası:'));
db.once('open', () => {
  console.log('MongoDB bağlantısı başarılı!');
});

// Todo modeli
const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'web'
  }
});

const Todo = mongoose.model('Todo', todoSchema);

// Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Telegram mesajlarını dinleme
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Bot komutlarını işleme
  if (text === '/start') {
    bot.sendMessage(chatId, 'Todo uygulamasına hoş geldiniz! Yapılacak bir iş eklemek için mesajınızı yazın.');
    return;
  }

  if (text === '/list') {
    try {
      const todos = await Todo.find({ completed: false }).sort({ createdAt: -1 });
      if (todos.length === 0) {
        bot.sendMessage(chatId, 'Henüz yapılacak işiniz yok.');
      } else {
        let message = 'Yapılacaklar Listesi:\n\n';
        todos.forEach((todo, index) => {
          message += `${index + 1}. ${todo.text}\n`;
        });
        bot.sendMessage(chatId, message);
      }
    } catch (error) {
      console.error('Todo listeleme hatası:', error);
      bot.sendMessage(chatId, 'Liste alınırken bir hata oluştu.');
    }
    return;
  }

  // Yeni todo ekleme
  if (text && !text.startsWith('/')) {
    try {
      const newTodo = new Todo({
        text: text,
        source: 'telegram'
      });
      await newTodo.save();
      bot.sendMessage(chatId, `"${text}" todo listenize eklendi!`);
    } catch (error) {
      console.error('Todo ekleme hatası:', error);
      bot.sendMessage(chatId, 'Todo eklenirken bir hata oluştu.');
    }
  }
});

// API Routes
// Tüm todoları getir
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    console.error('Todo getirme hatası:', error);
    res.status(500).json({ error: 'Todo\'lar alınırken bir hata oluştu' });
  }
});

// Yeni todo ekle
app.post('/api/todos', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Todo metni gereklidir' });
    }

    const newTodo = new Todo({ text });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Todo ekleme hatası:', error);
    res.status(500).json({ error: 'Todo eklenirken bir hata oluştu' });
  }
});

// Todo durumunu güncelle
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      { completed },
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: 'Todo bulunamadı' });
    }

    res.json(updatedTodo);
  } catch (error) {
    console.error('Todo güncelleme hatası:', error);
    res.status(500).json({ error: 'Todo güncellenirken bir hata oluştu' });
  }
});

// Todo sil
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);

    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo bulunamadı' });
    }

    res.json({ message: 'Todo başarıyla silindi' });
  } catch (error) {
    console.error('Todo silme hatası:', error);
    res.status(500).json({ error: 'Todo silinirken bir hata oluştu' });
  }
});

// Ana sayfa route'u
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});