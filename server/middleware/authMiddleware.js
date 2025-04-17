const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        // Add user to request
        req.user = {
            id: user._id.toString()
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
