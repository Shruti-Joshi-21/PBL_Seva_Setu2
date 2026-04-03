import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        role_id: Number(roleId),
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2E3BB] px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-[#005F02] mb-6 text-center">Create account</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="1">Admin</option>
              <option value="2">Team Lead</option>
              <option value="3">Field Worker</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#005F02] text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing up…' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-[#005F02] font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
