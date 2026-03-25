import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, Users, CheckCircle, AlertTriangle, ArrowRight, BarChart3, TrendingUp, Bell } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
                    <Icon className="w-7 h-7" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </div>
                )}
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        </div>
    );

    const chartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Verified Attendance',
                data: [45, 52, 48, 61, 55, 12, 8],
                borderColor: '#005F02',
                backgroundColor: 'rgba(0, 95, 2, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Flags',
                data: [3, 5, 2, 8, 4, 1, 0],
                borderColor: '#B91C1C',
                borderDash: [5, 5],
                tension: 0.4
            }
        ]
    };

    if (loading) return <div className="text-center py-10">Loading analytics...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-[#005F02]">Admin Analytics</h2>
                    <p className="text-gray-500">Real-time overview of system-wide operations.</p>
                </div>
                <div className="text-sm text-gray-400 font-medium italic">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Workforce"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    color="blue"
                    trend="+12%"
                />
                <StatCard
                    title="Active Tasks"
                    value={stats?.totalTasks || 0}
                    icon={LayoutDashboard}
                    color="indigo"
                />
                <StatCard
                    title="Verified Today"
                    value={stats?.verifiedAttendances || 0}
                    icon={CheckCircle}
                    color="green"
                    trend="+5%"
                />
                <StatCard
                    title="Flagged Records"
                    value={stats?.flaggedAttendances || 0}
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[#427A43]" /> Attendance Trends
                        </h3>
                        <select className="text-xs font-bold border-none bg-gray-50 rounded-lg p-1 outline-none text-gray-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <Line
                            data={chartData}
                            options={{
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { display: false } },
                                    x: { grid: { display: false } }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#C0B87A]" /> Critical Alerts
                        </h3>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">3 NEW</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-80">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">High Distance Variance</h4>
                                        <p className="text-xs text-gray-500 mb-2">Rahul Worker checked in 4.2km away from Juhu Beach location.</p>
                                        <span className="text-[10px] text-gray-400 font-medium">15 minutes ago</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="p-4 text-sm font-bold text-[#005F02] hover:bg-gray-50 transition-colors border-t border-gray-50 w-full flex items-center justify-center gap-2">
                        View All Flags <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
