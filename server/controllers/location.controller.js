const axios = require('axios');
const db = require('../config/db');

const searchLocation = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ success: false, message: 'Query parameter is required' });
        }

        // Using OpenStreetMap Nominatim API
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q,
                format: 'json',
                addressdetails: 1,
                limit: 5
            },
            headers: {
                'User-Agent': 'SevaSetu-App'
            }
        });

        const locations = response.data.map(item => ({
            display_name: item.display_name,
            lat: item.lat,
            lon: item.lon
        }));

        res.json({ success: true, data: locations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const saveLocation = async (req, res) => {
    try {
        const { name, address, latitude, longitude, radius } = req.body;
        const userId = req.userId;

        const [result] = await db.execute(
            'INSERT INTO task_locations (name, address, latitude, longitude, radius, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [name, address, latitude, longitude, radius || 200, userId]
        );

        res.status(201).json({
            success: true,
            message: 'Location saved successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getLocations = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM task_locations');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    searchLocation,
    saveLocation,
    getLocations
};
