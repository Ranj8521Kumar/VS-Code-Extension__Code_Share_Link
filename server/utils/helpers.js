/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
exports.generateRandomString = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Sanitize file path
 * @param {string} path - File path to sanitize
 * @returns {string} Sanitized path
 */
exports.sanitizeFilePath = (path) => {
    // Remove any leading slashes or dots
    let sanitized = path.replace(/^[\/\.]+/, '');
    
    // Replace any double dots (potential directory traversal)
    sanitized = sanitized.replace(/\.\./g, '');
    
    // Replace any double slashes
    sanitized = sanitized.replace(/\/\//g, '/');
    
    return sanitized;
};
