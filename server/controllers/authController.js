const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    username: user.username,
    role: user.role,
  };
}

function encodingArrayToBuffer(encoding) {
  if (!Array.isArray(encoding)) return null;
  const floatArray = new Float32Array(encoding);
  return Buffer.from(floatArray.buffer);
}

async function signupFieldWorker(req, res) {
  try {
    const { fullName, username, password } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ success: false, message: 'fullName, username, password are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'faceImage file is required' });
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const facesDir = path.join(__dirname, '..', 'uploads', 'faces');
    if (!fs.existsSync(facesDir)) fs.mkdirSync(facesDir, { recursive: true });

    const finalImagePath = path.join(facesDir, `${normalizedUsername}.jpg`);
    fs.renameSync(req.file.path, finalImagePath);

    const pythonResp = await axios.post('http://localhost:5001/register-face', {
      imagePath: finalImagePath,
      userId: normalizedUsername,
    });

    const encoding = pythonResp?.data?.encoding;
    if (!Array.isArray(encoding) || encoding.length !== 128) {
      return res.status(500).json({ success: false, message: 'Invalid face encoding from Python service' });
    }

    const user = await User.create({
      fullName,
      username: normalizedUsername,
      password: hashedPassword,
      role: 'FIELD_WORKER',
      faceImagePath: finalImagePath,
      faceEncoding: encodingArrayToBuffer(encoding),
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      message: 'Field worker registered successfully',
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function signupTeamLead(req, res) {
  try {
    const { fullName, username, password } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ success: false, message: 'fullName, username, password are required' });
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      username: normalizedUsername,
      password: hashedPassword,
      role: 'TEAM_LEAD',
      faceImagePath: null,
      faceEncoding: null,
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      message: 'Team lead registered successfully',
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function signupAdmin(req, res) {
  try {
    const { fullName, username, password } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ success: false, message: 'fullName, username, password are required' });
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      username: normalizedUsername,
      password: hashedPassword,
      role: 'ADMIN',
      faceImagePath: null,
      faceEncoding: null,
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function login(req, res) {
  try {
    const { username, email, password } = req.body;
    const rawUsername = username ?? email;
    if (!rawUsername || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }

    const normalizedUsername = String(rawUsername).toLowerCase().trim();
    const user = await User.findOne({ username: normalizedUsername, isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({
      success: true,
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getMe(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  signupFieldWorker,
  signupTeamLead,
  signupAdmin,
  login,
  getMe,
};

