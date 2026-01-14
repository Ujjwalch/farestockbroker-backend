const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); 
    
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Additional validation for token format
    if (token.split('.').length !== 3) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.adminId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token payload.' 
      });
    }

    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or admin not found.' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    let message = 'Invalid token.';
    if (error.name === 'JsonWebTokenError') {
      message = 'Malformed token. Please login again.';
    } else if (error.name === 'TokenExpiredError') {
      message = 'Token expired. Please login again.';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token not active yet.';
    }
    
    res.status(401).json({ 
      success: false, 
      message: message
    });
  }
};

const generateToken = (adminId, expiresIn = '24h') => {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    if (!token || token.trim() === '' || token.split('.').length !== 3) {
      return null;
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

module.exports = {
  authenticateAdmin,
  generateToken,
  verifyToken
};