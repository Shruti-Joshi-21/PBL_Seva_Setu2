import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, MapPin, Clock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

const WorkerDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks/worker');
            setTasks(response.data.data);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-10">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-[#005F02]">My Assigned Tasks</h2>
                <span className="bg-[#F2E3BB] text-[#005F02] px-3 py-1 rounded-full text-sm font-semibold">
                    {tasks.length} Active
                </span>
            </div>

            {tasks.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No tasks found</h3>
                    <p className="text-gray-500">You don't have any tasks assigned for today.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(task => {
                        const tid = task._id || task.id;
                        const loc = task.locationName || task.location_name;
                        const st = task.startTime || task.start_time;
                        const et = task.endTime || task.end_time;
                        return (
                        <div key={tid} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${task.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {task.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <MapPin className="w-4 h-4 text-[#427A43]" />
                                    <span>{loc}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <Clock className="w-4 h-4 text-[#427A43]" />
                                    <span>{st} – {et}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/worker/attendance/${tid}`)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#005F02] text-white rounded-xl font-semibold hover:bg-[#427A43] transition-colors"
                            >
                                Mark Attendance <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WorkerDashboard;
