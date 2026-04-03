import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader } from 'lucide-react';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', { email, password });
      const payload = data.data;
      login({
        token: payload.token,
        role: payload.role,
        fullName: payload.fullName,
        userId: payload.userId,
      });
      if (payload.role === 'ADMIN') navigate('/admin');
      else if (payload.role === 'TEAM_LEAD') navigate('/teamlead');
      else navigate('/worker');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2E3BB] px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#005F02]">SevaSetu</h1>
          <p className="text-[#427A43] mt-2">Smart Field Workforce Management</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005F02] focus:border-transparent transition-all outline-none"
                placeholder="admin@sevasetu.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005F02] focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#005F02] text-white py-2.5 rounded-lg font-semibold hover:bg-[#427A43] transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link to="/signup" className="text-[#005F02] font-medium">
            Create an account
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SevaSetu Platform. All Rights Reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
