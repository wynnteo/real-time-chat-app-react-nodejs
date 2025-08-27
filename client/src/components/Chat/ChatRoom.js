import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import styled from 'styled-components';

const ChatContainer = styled.div`
  display: flex;
  height: 100vh;
  background: #f5f5f5;
`;

const Sidebar = styled.div`
  width: 300px;
  background: white;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  background: #ceb89f;
  color: black;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UsersList = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
`;

const UserItem = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.active ? '#e3f2fd' : 'transparent'};
  position: relative;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const OnlineIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.online ? '#4caf50' : '#ccc'};
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
`;

const UserInitials = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ceb89f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
`;

const MainChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  padding: 1rem;
  background: #ceb89f;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: white;
  position: relative;
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  
  &:hover {
    background: #e0e0e0;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const MessageGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  align-items: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
`;

const Message = styled.div`
  padding: 0.75rem;
  border-radius: 12px;
  background: ${props => props.isOwn ? '#ceb89f' : '#e9ecef'};
  color: ${props => props.isOwn ? 'white' : 'black'};
  max-width: 70%;
  word-wrap: break-word;
`;

const MessageInfo = styled.div`
  font-size: 0.7rem;
  color: #666;
  margin: 0.25rem 0.5rem;
`;

const FileMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-top: 0.5rem;
`;

const FileLink = styled.a`
  color: inherit;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const TypingIndicator = styled.div`
  font-style: italic;
  color: #666;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
`;

const MessageInput = styled.div`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #ddd;
`;

const FileUpload = styled.input`
  display: none;
`;

const FileUploadButton = styled.label`
  padding: 0.75rem;
  background: #6b6b6b;
  color: white;
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 45px;
  
  &:hover {
    background: #ceb89f;
  }
`;

const TextInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border-radius: 25px;
  border: 1px solid #ddd;
  outline: none;
  font-size: 16px;
  
  &:focus {
    border-color: #ceb89f;
  }
`;

const SendButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #6b6b6b;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  
  &:hover {
    background-color: #ceb89f;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const GeneralChatButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  background: ${props => !props.isPrivateChat ? '#6b6b6b' : '#ceb89f'};
  color: ${props => !props.isPrivateChat ? 'white' : 'black'};
  border: none;
  border-radius: 5px;
  cursor: pointer;
  
  &:hover {
    background: ${props => !props.isPrivateChat ? '#ceb89f' : '#ceb89f'};
  }
`;

const ChatRoom = ({ user, token, onLogout }) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState([]);
  const [privateTyping, setPrivateTyping] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(new Map());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const privateTypingTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (socket && token && isConnected) {
      // Clear existing listeners first
      socket.removeAllListeners();
      
      socket.emit('authenticate', token);

      socket.on('authenticated', (data) => {
        console.log('Authenticated:', data.user);
        setIsAuthenticated(true);
        
        socket.emit('get_users');
        socket.emit('join_room', currentRoom);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (!usersLoaded) {
            console.log('Retrying user list load...');
            socket.emit('get_users');
          }
        }, 2000);
      });

      socket.on('auth_error', (message) => {
        console.error('Auth error:', message);
        setIsAuthenticated(false);
        setUsersLoaded(false);
        onLogout();
      });

      socket.on('room_messages', (data) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
        setCurrentPage(1);
      });

      socket.on('more_messages', (data) => {
        setMessages(prev => [...data.messages, ...prev]);
        setHasMore(data.hasMore);
        setCurrentPage(data.page);
        setLoadingMore(false);
      });

      socket.on('new_message', (message) => {
        setMessages(prev => [...prev, message]);
        
        // Show notification if tab is not visible
        if (document.hidden && message.sender._id !== user.id) {
          if (Notification.permission === 'granted') {
            new Notification(`New message from ${message.sender.username}`, {
              body: message.messageType === 'file' ? 'Shared a file' : message.content,
              icon: '/favicon.ico'
            });
          }
        }
      });

      socket.on('new_private_message', (message) => {
        const messageFromCurrentChat = isPrivateChat && selectedUser && (
          message.sender._id === selectedUser._id || message.sender._id === user.id
        );

        if (messageFromCurrentChat) {
          setMessages(prev => [...prev, message]);
        } else if (message.sender._id !== user.id) {
          setUnreadMessages(prev => {
            const newUnread = new Map(prev);
            const currentCount = newUnread.get(message.sender._id) || 0;
            newUnread.set(message.sender._id, currentCount + 1);
            return newUnread;
          });
        }

        if (document.hidden && message.sender._id !== user.id) {
          if (Notification.permission === 'granted') {
            new Notification(`Private message from ${message.sender.username}`, {
              body: message.content,
              icon: '/favicon.ico'
            });
          }
        }
      });

      socket.on('private_messages', (data) => {
        setMessages(data.messages);
        setCurrentRoom(data.room);
        setHasMore(data.hasMore);
        setCurrentPage(1);

        if (selectedUser) {
          setUnreadMessages(prev => {
            const newUnread = new Map(prev);
            newUnread.delete(selectedUser._id);
            return newUnread;
          });
        }
      });

      socket.on('users_list', (usersList) => {
        setUsers(usersList);
        setUsersLoaded(true);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      });

      socket.on('users_list_update', (usersList) => {
        const filteredUsers = usersList.filter(u => u._id !== user.id);
        setUsers(filteredUsers);
        setUsersLoaded(true);
      });

      socket.on('user_typing', (data) => {
        if (data.room === currentRoom) {
          setTyping(prev => [...prev.filter(t => t.userId !== data.userId), data]);
        }
      });

      socket.on('user_stop_typing', (data) => {
        if (data.room === currentRoom) {
          setTyping(prev => prev.filter(t => t.userId !== data.userId));
        }
      });

      socket.on('private_typing', (data) => {
        if (isPrivateChat && selectedUser && data.userId === selectedUser._id) {
          setPrivateTyping(data);
          if (privateTypingTimeoutRef.current) {
            clearTimeout(privateTypingTimeoutRef.current);
          }
          
          privateTypingTimeoutRef.current = setTimeout(() => {
            setPrivateTyping(null);
          }, 3000);
        }
      });

      socket.on('private_stop_typing', (data) => {
        if (isPrivateChat && selectedUser && data.userId === selectedUser._id) {
          setPrivateTyping(null);
          if (privateTypingTimeoutRef.current) {
            clearTimeout(privateTypingTimeoutRef.current);
          }
        }
      });

      socket.on('user_online', (data) => {
        setUsers(prev => prev.map(u => 
          u._id === data.userId ? { ...u, isOnline: true } : u
        ));
      });

      socket.on('user_offline', (data) => {
        setUsers(prev => prev.map(u => 
          u._id === data.userId ? { ...u, isOnline: false } : u
        ));
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert(error);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsAuthenticated(false);
        setUsersLoaded(false);
      });

      socket.on('reconnect', () => {
        console.log('Socket reconnected');
        setTimeout(() => {
          socket.emit('authenticate', token);
        }, 100);
      });

      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (privateTypingTimeoutRef.current) {
          clearTimeout(privateTypingTimeoutRef.current);
        }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [socket, token, currentRoom, isPrivateChat, selectedUser, user.id, onLogout, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore && socket) {
      setLoadingMore(true);
      socket.emit('load_more_messages', {
        room: currentRoom,
        page: currentPage
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && isConnected) {
      if (isPrivateChat) {
        socket.emit('send_private_message', {
          recipientId: selectedUser._id,
          content: newMessage
        });
      } else {
        socket.emit('send_message', {
          content: newMessage,
          room: currentRoom
        });
      }
      setNewMessage('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (isPrivateChat) {
        socket.emit('private_stop_typing', { recipientId: selectedUser._id });
      } else {
        socket.emit('typing_stop', { room: currentRoom });
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && isConnected) {
      if (e.target.value && e.target.value.trim()) {
        if (isPrivateChat) {
          socket.emit('private_typing', { recipientId: selectedUser._id });
        } else {
          socket.emit('typing_start', { room: currentRoom });
        }

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          if (isPrivateChat) {
            socket.emit('private_stop_typing', { recipientId: selectedUser._id });
          } else {
            socket.emit('typing_stop', { room: currentRoom });
          }
        }, 1000);
      } else {
        if (isPrivateChat) {
          socket.emit('private_stop_typing', { recipientId: selectedUser._id });
        } else {
          socket.emit('typing_stop', { room: currentRoom });
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5001/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        if (isPrivateChat) {
          socket.emit('send_private_message', {
            recipientId: selectedUser._id,
            content: `${data.originalName}|${data.fileUrl}`
          });
        } else {
          socket.emit('send_message', {
            content: `${data.originalName}|${data.fileUrl}`,
            room: currentRoom,
            messageType: 'file'
          });
        }
      } else {
        alert('File upload failed: ' + data.message);
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('File upload failed');
    }

    e.target.value = '';
  };

  const startPrivateChat = (selectedUserData) => {
    setSelectedUser(selectedUserData);
    setIsPrivateChat(true);
    setMessages([]);

    setUnreadMessages(prev => {
      const newUnread = new Map(prev);
      newUnread.delete(selectedUserData._id);
      return newUnread;
    });
    
    if (socket) {
      socket.emit('join_private_conversation', {
        recipientId: selectedUserData._id
      });
    }
  };

  const switchToGeneralChat = () => {
    setIsPrivateChat(false);
    setSelectedUser(null);
    setCurrentRoom('general');
    setMessages([]);
    setPrivateTyping(null);
    
    if (socket) {
      socket.emit('join_room', 'general');
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.emit('user_logout');
    }
    onLogout();
  };

  const getUserInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : '??';
  };

  const renderMessage = (message) => {
    const isFileMessage = message.messageType === 'file' || message.content.includes('|/uploads/');
    
    if (isFileMessage) {
      const parts = message.content.split('|');
      const fileName = parts[0];
      const fileUrl = parts[1];
      
      return (
        <FileMessage>
          <span>📎</span>
          <FileLink href={fileUrl} target="_blank" rel="noopener noreferrer">
            {fileName}
          </FileLink>
        </FileMessage>
      );
    }
    
    return <div>{message.content}</div>;
  };

  return (
    <ChatContainer>
      <Sidebar>
        <SidebarHeader>
          <h3>Users</h3>
          <span>{isConnected ? '🟢' : '🔴'}</span>
        </SidebarHeader>
        
        <div style={{ padding: '1rem' }}>
          <GeneralChatButton 
            onClick={switchToGeneralChat}
            isPrivateChat={isPrivateChat}
          >
            General Chat
          </GeneralChatButton>
        </div>
        
        <UsersList>
          {!usersLoaded && isConnected && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
              Loading users...
            </div>
          )}
          
          {usersLoaded && users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
              No other users online
            </div>
          )}
          
          {users.map(userItem => (
            <UserItem 
              key={userItem._id}
              active={selectedUser?._id === userItem._id}
              onClick={() => startPrivateChat(userItem)}
            >
              <OnlineIndicator online={userItem.isOnline} />
              <UserInitials>
                {getUserInitials(userItem.username)}
              </UserInitials>
              <span>{userItem.username}</span>
              {unreadMessages.get(userItem._id) > 0 && (
                <NotificationBadge>
                  {unreadMessages.get(userItem._id)}
                </NotificationBadge>
              )}
            </UserItem>
          ))}
        </UsersList>
      </Sidebar>

      <MainChat>
        <ChatHeader>
          <div>
            <h2>
              {isPrivateChat 
                ? `Private chat with ${selectedUser?.username}`
                : `Chat Room - ${currentRoom}`}
            </h2>
            <p>Welcome, {user.username}!</p>
          </div>
          <LogoutButton onClick={handleLogout}>
            Logout
          </LogoutButton>
        </ChatHeader>

        <MessagesContainer>
          {hasMore && (
            <LoadMoreButton 
              onClick={loadMoreMessages} 
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More Messages'}
            </LoadMoreButton>
          )}
          
          {messages.map((message) => (
            <MessageGroup 
              key={message._id} 
              isOwn={message.sender._id === user.id}
            >
              <Message isOwn={message.sender._id === user.id}>
                {renderMessage(message)}
              </Message>
              <MessageInfo>
                {message.sender.username} • {new Date(message.createdAt).toLocaleTimeString()}
              </MessageInfo>
            </MessageGroup>
          ))}
          
          <div ref={messagesEndRef} />
        </MessagesContainer>

        {/* Typing indicators */}
        {typing.length > 0 && !isPrivateChat && (
          <TypingIndicator>
            {typing.map(t => t.username).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
          </TypingIndicator>
        )}
        
        {privateTyping && isPrivateChat && (
          <TypingIndicator>
            {privateTyping.username} is typing...
          </TypingIndicator>
        )}

        <MessageInput>
          <FileUpload
            id="file-upload" 
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <FileUploadButton htmlFor="file-upload">
            📎
          </FileUploadButton>
          
          <form onSubmit={handleSendMessage} style={{ display: 'flex', flex: 1, gap: '1rem' }}>
            <TextInput
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={isPrivateChat ? "Type a private message..." : "Type your message..."}
              disabled={!isConnected}
            />
            <SendButton 
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
            >
              Send
            </SendButton>
          </form>
        </MessageInput>
      </MainChat>
    </ChatContainer>
  );
};

export default ChatRoom;