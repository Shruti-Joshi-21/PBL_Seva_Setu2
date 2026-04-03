const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('../services/user.service');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role_id } = req.body;
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return sendError(res, 'Email already registered', 400);
    }
    const userId = await userService.createUser({ name, email, password, role_id });
    return sendSuccess(res, { userId }, 'User registered successfully', 201);
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const loginId = username ?? email;
    if (!loginId || !password) {
      return sendError(res, 'Email/username and password are required', 400);
    }
    const userRow = await userService.findByEmail(loginId);
    if (!userRow) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const isMatch = await bcrypt.compare(password, userRow.password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const token = jwt.sign(
      { userId: userRow.id, role: userRow.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const userDoc = await User.findById(userRow.id).select('fullName');
    return sendSuccess(res, {
      token,
      role: userRow.role_name,
      fullName: userDoc?.fullName || userRow.name,
      userId: userRow.id,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role_name,
      },
    }, 'Login successful');
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.userId);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, getMe };
