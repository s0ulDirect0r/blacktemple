'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import AuthForm from './AuthForm';

interface AdminAuthProps {
  children: ReactNode;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  logout: () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const session = sessionStorage.getItem('adminSession');
        if (!session) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${session}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem('adminSession');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        sessionStorage.removeItem('adminSession');
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const handleAuth = async (secret: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { token } = await response.json();
      sessionStorage.setItem('adminSession', token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth error:', error);
      throw new Error('Authentication failed');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminSession');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Black Temple Admin</h1>
        <AuthForm onAuth={handleAuth} />
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, logout: handleLogout }}>
      <div className="relative">
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
        {children}
      </div>
    </AdminAuthContext.Provider>
  );
} 