import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, role, name, id } = response.data.data;

      localStorage.setItem('sevasetu_token', token);
      localStorage.setItem('sevasetu_role', role);

      login({ token, role, name, id });

      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'TEAM_LEAD') navigate('/team-lead');
      else if (role === 'FIELD_WORKER') navigate('/field-worker');
      else navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005F02] focus:border-transparent transition-all outline-none"
                placeholder="Username / Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005F02] focus:border-transparent transition-all outline-none"
                placeholder="Password"
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
          <Link to="/" className="text-[#005F02] font-medium">
            Back to home
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
