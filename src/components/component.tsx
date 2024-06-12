"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import io from 'socket.io-client';
import axios from 'axios';
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const socket = io('http://localhost:8000');

interface Message {
  sender: string;
  receiver: string;
  message: string;
  timestamp: string;
}

interface User {
  username: string;
  online: boolean;
}

export default function Component() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    socket.on('message', (msg: Message) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
      scrollToBottom();
    });

    socket.on('userOnline', (username: string) => {
      setOnlineUsers((prevUsers) => [...prevUsers, { username, online: true }]);
    });

    socket.on('userOffline', (username: string) => {
      setOnlineUsers((prevUsers) => prevUsers.filter((user) => user.username !== username));
    });

    return () => {
      socket.off('message');
      socket.off('userOnline');
      socket.off('userOffline');
    };
  }, []);

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:8000/login', { username, password });
      if (response.status === 200) {
        setLoggedIn(true);
        socket.emit('join', username);

        const usersResponse = await axios.get('http://localhost:8000/users');
        setOnlineUsers(usersResponse.data);

        const messagesResponse = await axios.get('http://localhost:8000/messages');
        setMessages(messagesResponse.data);
      } else {
        console.error('Login failed:', response);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post('http://localhost:8000/register', { username, password });
      if (response.status === 201) {
        setIsRegistering(false);
      } else {
        console.error('Registration failed:', response);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleSendMessage = () => {
    if (currentChat) {
      const msg: Message = { sender: username, message, timestamp: new Date().toISOString(), receiver: currentChat };
      socket.emit('message', msg);
      setMessage('');
    }
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {!loggedIn ? (
        isRegistering ? (
          <div className="flex flex-col items-center">
            <input
              className="mb-2 p-2 border rounded text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="mb-2 p-2 border rounded text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
            <button className="p-2 bg-green-500 text-white rounded" onClick={handleRegister}>Register</button>
            <button className="mt-2 text-blue-500" onClick={() => setIsRegistering(false)}>Back to Login</button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <input
              className="mb-2 p-2 border rounded text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              className="mb-2 p-2 border rounded text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />
            <button className="p-2 bg-blue-500 text-white rounded" onClick={handleLogin}>Login</button>
            <button className="mt-2 text-blue-500" onClick={() => setIsRegistering(true)}>Register</button>
          </div>
        )
      ) : (
        <div className="grid min-h-screen w-full grid-cols-[280px_1fr] overflow-hidden">
          <div className="flex flex-col border-r bg-gray-100/40 dark:bg-gray-800/40">
            <div className="flex h-[60px] items-center px-6">
              <Link className="flex items-center gap-2 font-semibold" href="#">
                <span>Chat App</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              <nav className="grid gap-1 px-4 py-2 text-sm font-medium">
                {onlineUsers.map((user) => (
                  <Link
                    key={user.username}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${currentChat === user.username ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50' : 'text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-50'}`}
                    href="#"
                    onClick={() => setCurrentChat(user.username)}
                  >
                    <Avatar className="w-8 h-8 border">
                      <AvatarImage alt="Avatar" src="/placeholder-user.jpg" />
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">{user.username}</div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex h-[60px] items-center border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
              <div className="flex items-center gap-4">
                <Avatar className="w-8 h-8 border">
                  <AvatarImage alt="Avatar" src="/placeholder-user.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="font-medium">{currentChat}</div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="grid gap-4">
                {messages
                  .filter((msg) => msg.sender === currentChat || msg.receiver === currentChat)
                  .map((msg, index) => (
                    <div key={index} className={`flex items-start gap-4 ${msg.sender === username ? 'justify-end' : ''}`}>
                      {msg.sender !== username && (
                        <Avatar className="w-8 h-8 border">
                          <AvatarImage alt="Avatar" src="/placeholder-user.jpg" />
                          <AvatarFallback>{msg.sender.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`grid gap-1 rounded-lg p-3 text-sm ${msg.sender === username ? 'bg-blue-500 text-white' : 'bg-gray-100 text-black dark:bg-gray-800 dark:text-gray-50'}`}>
                        <div className="font-medium">{msg.sender}</div>
                        <div>{msg.message}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      </div>
                      {msg.sender === username && (
                        <Avatar className="w-8 h-8 border">
                          <AvatarImage alt="Avatar" src="/placeholder-user.jpg" />
                          <AvatarFallback>{msg.sender.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                <div ref={messageEndRef} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white py-4 dark:bg-gray-950">
              <div className="mx-auto flex max-w-2xl items-center gap-4 px-4">
                <Input
                  className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm dark:bg-gray-800"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button className="rounded-full" size="icon" variant="ghost" onClick={handleSendMessage}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

