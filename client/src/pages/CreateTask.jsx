import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, Users, Calendar, Clock, Plus, Loader, CheckCircle } from 'lucide-react';

const CreateTask = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [locations, setLocations] = useState([]);
    const [workers, setWorkers] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location_id: '',
        radius: 200,
        start_time: '',
        end_time: '',
        worker_ids: []
    });

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const token = localStorage.getItem('token');
            // In a real app, you'd have an endpoint to get workers. Mocked for now.
            const response = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Mock worker list (in production, fetch all FIELD_WORKER users)
            setWorkers([
                { id: 1, name: 'Rahul Sharma' },
                { id: 2, name: 'Anjali Gupta' },
                { id: 3, name: 'Vikram Singh' }
            ]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/locations/search?q=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocations(response.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSaveLocation = async (loc) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/locations/save', {
                name: loc.display_name.split(',')[0],
                address: loc.display_name,
                latitude: loc.lat,
                longitude: loc.lon,
                radius: formData.radius
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({ ...formData, location_id: response.data.data.id });
            setLocations([]);
            setSearchQuery(loc.display_name.split(',')[0]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/tasks/create', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/team-lead');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-[#005F02]">Create New Task</h2>
                <p className="text-gray-500">Assign workers to a verified location with geofencing.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#005F02]" /> General Information
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02]"
                                placeholder="e.g., Survey at Central Park"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02] h-24"
                                placeholder="Details about the field work..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#005F02]" /> Location & Radius
                        </h3>
                        <div className="relative">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02]"
                                    placeholder="Search location..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="px-4 py-2 bg-[#F2E3BB] text-[#005F02] font-bold rounded-lg hover:bg-[#C0B87A]"
                                >
                                    {searchLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                </button>
                            </div>

                            {locations.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-xl z-10 overflow-hidden">
                                    {locations.map((loc, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSaveLocation(loc)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-sm"
                                        >
                                            <p className="font-semibold text-gray-800">{loc.display_name.split(',')[0]}</p>
                                            <p className="text-gray-500 truncate">{loc.display_name}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Radius (meters)</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02]"
                                    value={formData.radius}
                                    onChange={e => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                                >
                                    <option value={100}>100m</option>
                                    <option value={200}>200m</option>
                                    <option value={500}>500m</option>
                                    <option value={1000}>1km</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#005F02]" /> Schedule
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02]"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#005F02]"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#005F02]" /> Assign Workers
                        </h3>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {workers.map(worker => (
                                <label key={worker.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#005F02] rounded"
                                        checked={formData.worker_ids.includes(worker.id)}
                                        onChange={e => {
                                            const ids = e.target.checked
                                                ? [...formData.worker_ids, worker.id]
                                                : formData.worker_ids.filter(id => id !== worker.id);
                                            setFormData({ ...formData, worker_ids: ids });
                                        }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">{worker.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !formData.location_id}
                        className="w-full bg-[#005F02] text-white py-3 rounded-xl font-bold hover:bg-[#427A43] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Create Task</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Add this to make it compatible with the previous code's import
const FileText = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;

export default CreateTask;
