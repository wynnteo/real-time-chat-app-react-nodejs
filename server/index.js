const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('./models/Message');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const messageRateLimit = new Map();
const userSockets = new Map();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed!'));
    }
  }
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

app.use('/uploads', express.static('uploads'));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        socket.emit('auth_error', 'Invalid user');
        return;
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      socket.avatar = user.avatar;

      // Remove old socket if exists
      const oldSocketId = userSockets.get(socket.userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect();
        }
      }

      userSockets.set(socket.userId, socket.id);
      await User.findByIdAndUpdate(user._id, { 
        isOnline: true,
        lastSeen: new Date() 
      });

      socket.emit('authenticated', { 
        user: {
          id: user._id,
          username: user.username,
          avatar: user.avatar
        }
      });

      // Broadcast user online status to others
      socket.broadcast.emit('user_online', {
        userId: user._id,
        username: user.username
      });

      // Send updated users list to all clients to ensure consistency
      const users = await User.find({})
        .select('username avatar isOnline lastSeen')
        .sort({ isOnline: -1, lastSeen: -1 })
        .limit(50)
        .exec();
      
      // Send to all sockets to keep everyone synchronized
      io.emit('users_list_update', users);

    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', 'Invalid token');
    }
  });

  socket.on('join_room', async (roomName) => {
    socket.join(roomName);
    socket.currentRoom = roomName;
    
    try {
      const messages = await Message.find({ room: roomName })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(20)
        .exec();
      
      socket.emit('room_messages', {
        messages: messages.reverse(),
        hasMore: messages.length === 20
      });
    } catch (error) {
      console.error('Error loading room messages:', error);
      socket.emit('error', 'Failed to load room messages');
    }
  });

  socket.on('load_more_messages', async (data) => {
    try {
      const { room, page = 1, limit = 20 } = data;
      const skip = page * limit;
      
      const messages = await Message.find({ room })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      
      socket.emit('more_messages', {
        messages: messages.reverse(),
        hasMore: messages.length === limit,
        page: page + 1
      });
    } catch (error) {
      console.error('Error loading more messages:', error);
      socket.emit('error', 'Failed to load more messages');
    }
  });

  socket.on('send_message', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const userId = socket.userId;
      const now = Date.now();
      const userRateData = messageRateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
      
      if (now > userRateData.resetTime) {
        userRateData.count = 0;
        userRateData.resetTime = now + 60000;
      }
      
      if (userRateData.count >= 30) {
        socket.emit('error', 'Rate limit exceeded. Please slow down.');
        return;
      }
      
      userRateData.count++;
      messageRateLimit.set(userId, userRateData);

      if (!data.content || data.content.trim().length === 0) {
        socket.emit('error', 'Message content cannot be empty');
        return;
      }

      const message = new Message({
        content: data.content.trim(),
        sender: socket.userId,
        room: data.room || 'general',
        messageType: data.messageType || 'text'
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        room: message.room,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      io.to(data.room || 'general').emit('new_message', messageData);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('send_private_message', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const { recipientId, content } = data;

      if (!recipientId || !content || content.trim().length === 0) {
        socket.emit('error', 'Invalid message data');
        return;
      }

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        socket.emit('error', 'Recipient not found');
        return;
      }

      const privateRoom = `private_${[socket.userId, recipientId].sort().join('_')}`;
      
      const message = new Message({
        content: content.trim(),
        sender: socket.userId,
        room: privateRoom,
        messageType: 'text'
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        room: message.room,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_private_message', messageData);
      }

      socket.emit('new_private_message', messageData);

    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('error', 'Failed to send private message');
    }
  });

  socket.on('join_private_conversation', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', 'Not authenticated');
        return;
      }

      const { recipientId } = data;
      
      if (!recipientId) {
        socket.emit('error', 'Recipient ID required');
        return;
      }

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        socket.emit('error', 'Recipient not found');
        return;
      }

      const privateRoom = `private_${[socket.userId, recipientId].sort().join('_')}`;
      
      socket.join(privateRoom);
      
      const messages = await Message.find({ room: privateRoom })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(20)
        .exec();
      
      socket.emit('private_messages', {
        messages: messages.reverse(),
        room: privateRoom,
        recipientId: recipientId,
        hasMore: messages.length === 20
      });
    } catch (error) {
      console.error('Error joining private conversation:', error);
      socket.emit('error', 'Failed to join private conversation');
    }
  });

  socket.on('get_users', async () => {
    try {
      if (!socket.userId) {
        socket.emit('auth_error', 'Not authenticated');
        return;
      }

      const users = await User.find({ 
        _id: { $ne: socket.userId } 
      })
        .select('username avatar isOnline lastSeen')
        .sort({ isOnline: -1, lastSeen: -1 })
        .limit(50)
        .exec();
      
      socket.emit('users_list', users);
    } catch (error) {
      console.error('Error getting users list:', error);
      socket.emit('error', 'Failed to get users list');
    }
  });

  socket.on('typing_start', (data) => {
    if (!socket.userId || !data.room) return;
    
    socket.to(data.room).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      room: data.room
    });
  });

  socket.on('typing_stop', (data) => {
    if (!socket.userId || !data.room) return;
    
    socket.to(data.room).emit('user_stop_typing', {
      userId: socket.userId,
      room: data.room
    });
  });

  // Private typing events
  socket.on('private_typing', (data) => {
    if (!socket.userId || !data.recipientId) return;
    
    const recipientSocketId = userSockets.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private_typing', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });

  socket.on('private_stop_typing', (data) => {
    if (!socket.userId || !data.recipientId) return;
    
    const recipientSocketId = userSockets.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private_stop_typing', {
        userId: socket.userId
      });
    }
  });

  // Handle explicit logout
  socket.on('user_logout', async () => {
    if (socket.userId) {
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        socket.broadcast.emit('user_offline', {
          userId: socket.userId
        });

        // Send updated users list to all clients to show offline status
        const users = await User.find({})
          .select('username avatar isOnline lastSeen')
          .sort({ isOnline: -1, lastSeen: -1 })
          .limit(50)
          .exec();
        
        socket.broadcast.emit('users_list_update', users);

        userSockets.delete(socket.userId);
        socket.disconnect();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      // Remove from userSockets map
      const currentSocketId = userSockets.get(socket.userId);
      if (currentSocketId === socket.id) {
        userSockets.delete(socket.userId);
        
        try {
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          socket.broadcast.emit('user_offline', {
            userId: socket.userId
          });

          // Send updated users list to all clients
          const users = await User.find({})
            .select('username avatar isOnline lastSeen')
            .sort({ isOnline: -1, lastSeen: -1 })
            .limit(50)
            .exec();
          
          socket.broadcast.emit('users_list_update', users);

        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.use('/api/auth', require('./routes/auth'));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  if (error.message === 'Only images and documents are allowed!') {
    return res.status(400).json({ message: error.message });
  }
  
  console.error('Server error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});