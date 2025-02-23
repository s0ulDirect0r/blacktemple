'use client';

import { useState, ReactNode } from 'react';
import AuthForm from './AuthForm';
import React from 'react';

interface AdminAuthProps {
  children: ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');

  const handleAuth = async (secret: string) => {
    try {
      const formData = new FormData();
      formData.append('ADMIN_SECRET', secret);

      const response = await fetch('/api/auth', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      setAdminSecret(secret);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth error:', error);
      throw new Error('Authentication failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Black Temple Admin</h1>
        <AuthForm onAuth={handleAuth} />
      </div>
    );
  }
} 