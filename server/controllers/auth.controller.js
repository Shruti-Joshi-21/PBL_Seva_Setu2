const path = require('path');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

function signToken(user) {
  const id = user._id.toString();
  return jwt.sign(
    { id, role: user.role, name: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
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
      return sendError(res, 'fullName, username, password are required', 400);
    }
    if (!req.file) {
      return sendError(res, 'faceImage file is required', 400);
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return sendError(res, 'Username already taken', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const facesDir = path.join(__dirname, '..', 'uploads', 'faces');
    if (!fs.existsSync(facesDir)) fs.mkdirSync(facesDir, { recursive: true });

    const finalImagePath = path.join(facesDir, `${normalizedUsername}.jpg`);
    fs.renameSync(req.file.path, finalImagePath);

    let encoding = null;
    try {
      const pythonResp = await axios.post('http://localhost:5001/register-face', {
        imagePath: finalImagePath,
        userId: normalizedUsername,
      });
      encoding = pythonResp?.data?.encoding;
    } catch (e) {
      return sendError(res, 'Face registration service unavailable', 503);
    }

    if (!Array.isArray(encoding) || encoding.length !== 128) {
      return sendError(res, 'Invalid face encoding from Python service', 500);
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
    return sendSuccess(
      res,
      {
        token,
        user: toSafeUser(user),
      },
      'Field worker registered successfully',
      201
    );
  } catch (error) {
    return sendError(res, error.message || 'Signup failed', 500);
  }
}

async function signupTeamLead(req, res) {
  try {
    const { fullName, username, password } = req.body;
    if (!fullName || !username || !password) {
      return sendError(res, 'fullName, username, password are required', 400);
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return sendError(res, 'Username already taken', 400);

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
    return sendSuccess(
      res,
      {
        token,
        user: toSafeUser(user),
      },
      'Team lead registered successfully',
      201
    );
  } catch (error) {
    return sendError(res, error.message || 'Signup failed', 500);
  }
}

async function signupAdmin(req, res) {
  try {
    const { fullName, username, password } = req.body;
    if (!fullName || !username || !password) {
      return sendError(res, 'fullName, username, password are required', 400);
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) return sendError(res, 'Username already taken', 400);

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
    return sendSuccess(
      res,
      {
        token,
        user: toSafeUser(user),
      },
      'Admin registered successfully',
      201
    );
  } catch (error) {
    return sendError(res, error.message || 'Signup failed', 500);
  }
}

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return sendError(res, 'Username and password are required', 400);
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const user = await User.findOne({ username: normalizedUsername, isDeleted: false });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const token = signToken(user);
    return sendSuccess(
      res,
      {
        token,
        role: user.role,
        name: user.fullName,
        id: user._id.toString(),
      },
      'Login successful'
    );
  } catch (error) {
    return sendError(res, error.message || 'Login failed', 500);
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error.message || 'Failed to load user', 500);
  }
};

module.exports = {
  signupFieldWorker,
  signupTeamLead,
  signupAdmin,
  login,
  getMe,
};
