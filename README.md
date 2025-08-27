# How to Build a Real-Time Chat App with React.js and Socket.io 2025

A full-featured real-time chat application built with modern web technologies including React.js, Node.js, Socket.io, and MongoDB.

## Features

- **Real-time messaging** between multiple users
- **User authentication** with secure login and registration
- **Message history** stored in MongoDB database
- **Online status indicators** showing who's currently active
- **Typing indicators** to show when users are composing messages
- **Private messaging** between users
- **File sharing** capabilities (images, documents)
- **Message timestamps** and user avatars
- **Responsive design** that works on all devices
- **Room-based conversations** for organized discussions

## Tech Stack

**Frontend:**
- React.js (with Hooks)
- Socket.io Client
- Axios for HTTP requests
- React Router DOM
- Styled Components

**Backend:**
- Node.js
- Express.js
- Socket.io Server
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Multer for file uploads

## Prerequisites

Before running this application, make sure you have:

- Node.js (version 16 or higher)
- MongoDB Atlas account (free tier sufficient)
- Basic knowledge of React.js and Express.js
- Code editor (VS Code recommended)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd realtime-chat-app
```

### 2. Project Structure Setup

```bash
mkdir client server
```

### 3. Backend Setup

```bash
cd server
npm init -y
npm install express socket.io mongoose bcryptjs jsonwebtoken cors multer dotenv
npm install -D nodemon
```

Create `server/.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
PORT=5001
NODE_ENV=development
```

### 4. Frontend Setup

```bash
cd ../client
npx create-react-app .
npm install socket.io-client axios react-router-dom styled-components
```

## 🔧 Installation & Running

### Start the Backend Server

```bash
cd server
npm run dev
```
The server will run on `http://localhost:5001`

### Start the Frontend Application

```bash
cd client
npm start
```
The React app will run on `http://localhost:3000`

## Tutorial

For a detailed step-by-step tutorial on building this application, visit:
[Real-Time Chat App Tutorial](https://cloudfullstack.dev/real-time-chat-app-react-socket-2025/)


## Support

If you encounter any issues or have questions:
- Review the detailed tutorial linked above
- Open an issue in this repository
