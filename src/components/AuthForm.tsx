'use client';

import { useState } from 'react';

interface AuthFormProps {
  onAuth: (secret: string) => Promise<void>;
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAuth(secret);
    } catch (err) {
      setError('Authentication failed: ' + err);
      setSecret('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        <input
          type="password"
          placeholder="Admin Password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Authenticate
        </button>
      </div>
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </form>
  );
} 