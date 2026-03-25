import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, AlertTriangle, Clock, MapPin, User, Shield, Camera, Filter, Search, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const AttendanceReview = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming this endpoint returns attendance records with user and task details
            const response = await axios.get('http://localhost:5000/api/attendance/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecords(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch attendance records');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/api/attendance/${id}/review`, { status: action }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Record marked as ${action}`);
            fetchRecords();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const filteredRecords = records.filter(r => filter === 'ALL' || r.status === filter);

    if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-[#005F02]" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#005F02]">Attendance Review</h2>
                    <p className="text-gray-500">Review flagged records and verify field reports.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    {['ALL', 'VERIFIED', 'FLAGGED'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[#005F02] text-white' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredRecords.map((record) => (
                    <div key={record.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#F2E3BB] flex items-center justify-center text-[#005F02] font-bold text-lg">
                                    {record.worker_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{record.worker_name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5" /> {record.task_title}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 max-w-2xl">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-in</p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Clock className="w-4 h-4 text-green-500" />
                                        {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-out</p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </div>
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</p>
                                    <div className={`flex items-center gap-1.5 font-bold text-xs uppercase ${record.status === 'VERIFIED' ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                        {record.status === 'VERIFIED' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                        {record.status}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleAction(record.id, 'VERIFIED')}
                                    className="flex-1 lg:flex-none px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(record.id, 'REJECTED')}
                                    className="flex-1 lg:flex-none px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>

                        {record.status === 'FLAGGED' && (
                            <div className="px-6 py-3 bg-red-50/50 border-t border-red-50 flex items-center gap-2 text-xs font-semibold text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Detected anomalies: {record.flags || 'Possible location mismatch'}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredRecords.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No attendance records found for this filter.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceReview;
