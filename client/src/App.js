import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChatRoom from './components/Chat/ChatRoom';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const switchToRegister = () => {
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowRegister(false);
  };

  return (
    <SocketProvider>
      <div className="App">
        {user && token ? (
          <ChatRoom 
            user={user} 
            token={token} 
            onLogout={handleLogout} 
          />
        ) : (
          showRegister ? (
            <Register 
              onLogin={handleLogin}
              switchToLogin={switchToLogin}
            />
          ) : (
            <Login 
              onLogin={handleLogin}
              switchToRegister={switchToRegister}
            />
          )
        )}
      </div>
    </SocketProvider>
  );
}

export default App;