import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { LayoutDashboard, CheckCircle, AlertCircle, Plus, MapPin, Users, ArrowRight } from 'lucide-react';

const TeamLeadDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ activeTasks: 0, verifiedToday: 0, flaggedCount: 0 });
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const tasksRes = await api.get('/tasks/all');
            const tasks = tasksRes.data.data;
            setRecentTasks(tasks.slice(0, 5));
            setStats({
                activeTasks: tasks.filter(t => t.status === 'ACTIVE').length,
                verifiedToday: 12, // Mocked
                flaggedCount: 3     // Mocked
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, color, icon: Icon }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold text-gray-800">{value}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        </div>
    );

    if (loading) return <div className="text-center py-10">Loading dashboard...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#005F02]">Team Overview</h2>
                    <p className="text-gray-500">Monitor field work and verify attendance records.</p>
                </div>
                <button
                    onClick={() => navigate('/teamlead/tasks/create')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#005F02] text-white rounded-xl font-bold hover:bg-[#427A43] transition-all shadow-md active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Create New Task
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Active Tasks" value={stats.activeTasks} color="blue" icon={LayoutDashboard} />
                <StatCard title="Verified Today" value={stats.verifiedToday} color="green" icon={CheckCircle} />
                <StatCard title="Flagged Records" value={stats.flaggedCount} color="red" icon={AlertCircle} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">Recent Tasks</h3>
                        <button className="text-[#005F02] text-sm font-bold flex items-center gap-1 hover:underline">
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentTasks.map(task => (
                            <div key={task._id || task.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#F2E3BB] flex items-center justify-center text-[#005F02]">
                                        <CheckSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{task.title}</h4>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {task.locationName || task.location_name}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${task.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="font-bold text-gray-800">Quick Actions</h3>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#005F02] hover:bg-gray-50 transition-all text-center">
                            <Users className="w-6 h-6 text-[#005F02]" />
                            <span className="text-sm font-semibold text-gray-700">Add Worker</span>
                        </button>
                        <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#005F02] hover:bg-gray-50 transition-all text-center">
                            <MapPin className="w-6 h-6 text-[#005F02]" />
                            <span className="text-sm font-semibold text-gray-700">New Location</span>
                        </button>
                        <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#005F02] hover:bg-gray-50 transition-all text-center hover:scale-105">
                            <FileText className="w-6 h-6 text-[#005F02]" />
                            <span className="text-sm font-semibold text-gray-700">Daily Report</span>
                        </button>
                        <button className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-[#005F02] hover:bg-gray-50 transition-all text-center">
                            <Bell className="w-6 h-6 text-[#005F02]" />
                            <span className="text-sm font-semibold text-gray-700">Bulk Notify</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckSquare = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
const FileText = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
const Bell = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;

export default TeamLeadDashboard;
