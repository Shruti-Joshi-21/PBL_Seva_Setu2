const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.userRole === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Require Admin Role' });
    }
};

const isTeamLead = (req, res, next) => {
    if (req.userRole === 'TEAM_LEAD' || req.userRole === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Require Team Lead or Admin Role' });
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    isTeamLead
};
