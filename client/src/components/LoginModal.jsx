import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, Loader, User, Shield, Users } from 'lucide-react';
import { toast } from 'react-toastify';

const LoginModal = ({ isOpen, onClose, role }) => {
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
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.role}!`);
            
            // Redirect based on role
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'TEAM_LEAD') navigate('/team-lead');
            else navigate('/worker');
            
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Invalid email or password.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getRoleIcon = () => {
        switch (role) {
            case 'Volunteer': return <User className="text-[#427A43]" />;
            case 'Team Lead': return <Users className="text-[#005F02]" />;
            case 'Administrator': return <Shield className="text-[#F8AC3B]" />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                
                {/* Header */}
                <div className="bg-[#F1F8E9] p-6 flex justify-between items-center border-b border-[#E0D9C8]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white shadow-sm">
                            {getRoleIcon()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#1A1A1A]">Login as {role}</h2>
                            <p className="text-xs text-[#616161]">Access your dashboard</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white transition-colors text-[#616161]"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-in shake-in duration-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                        <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#005F02] transition-colors">
                                <Mail size={18} />
                            </span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005F02] focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700 ml-1">Password</label>
                        <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#005F02] transition-colors">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#005F02] focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#005F02] hover:bg-[#003D01] shadow-green-900/20'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-400">
                            By signing in, you agree to the SevaSetu Terms & Privacy Policy
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
