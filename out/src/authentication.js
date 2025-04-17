const vscode = require('vscode');
const { EventEmitter } = require('events');
const { setAuthToken } = require('./api');
/**
 * Initialize authentication handler
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {Object} api - API client
 * @returns {Object} Authentication handler
 */
function initializeAuth(context, api) {
    // Token storage key
    const TOKEN_KEY = 'authToken';
    // Event emitter for authentication changes
    const authEmitter = new EventEmitter();
    /**
     * Store authentication token
     * @param {string} token - Authentication token
     */
    const storeToken = (token) => {
        context.globalState.update(TOKEN_KEY, token);
        // Also set the token in the API module
        setAuthToken(token);
        authEmitter.emit('authChanged', true);
    };
    /**
     * Get authentication token
     * @returns {string|undefined} Authentication token
     */
    const getToken = () => {
        const token = context.globalState.get(TOKEN_KEY);
        // Ensure the API module has the token
        if (token) {
            setAuthToken(token);
        }
        return token;
    };
    /**
     * Clear authentication token
     */
    const clearToken = () => {
        context.globalState.update(TOKEN_KEY, undefined);
        // Also clear the token in the API module
        setAuthToken(null);
        authEmitter.emit('authChanged', false);
    };
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    const isAuthenticated = () => {
        return !!getToken();
    };
    /**
     * Authenticate user
     * @returns {Promise<boolean>} True if authentication successful, false otherwise
     */
    const authenticate = async () => {
        try {
            // Show authentication options
            const loginOption = 'Login';
            const registerOption = 'Register';
            const selectedOption = await vscode.window.showQuickPick([loginOption, registerOption], {
                placeHolder: 'Login or register to continue'
            });
            if (!selectedOption) {
                return false;
            }
            // Get email
            const email = await vscode.window.showInputBox({
                prompt: 'Enter your email',
                placeHolder: 'email@example.com',
                validateInput: (value) => {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address';
                }
            });
            if (!email) {
                return false;
            }
            // Get password
            const password = await vscode.window.showInputBox({
                prompt: 'Enter your password',
                password: true,
                validateInput: (value) => {
                    return value.length >= 6 ? null : 'Password must be at least 6 characters';
                }
            });
            if (!password) {
                return false;
            }
            // Login or register
            let token;
            if (selectedOption === loginOption) {
                token = await api.authenticate(email, password);
            }
            else {
                token = await api.register(email, password);
            }
            // Store token
            storeToken(token);
            vscode.window.showInformationMessage(`Successfully ${selectedOption === loginOption ? 'logged in' : 'registered'}!`);
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
            return false;
        }
    };
    /**
     * Logout user
     */
    const logout = () => {
        clearToken();
        vscode.window.showInformationMessage('Logged out successfully!');
    };
    /**
     * Register a callback for authentication changes
     * @param {Function} callback - Callback function
     */
    const onAuthenticationChanged = (callback) => {
        authEmitter.on('authChanged', callback);
    };
    return {
        isAuthenticated,
        authenticate,
        logout,
        getToken,
        onAuthenticationChanged
    };
}
module.exports = {
    initializeAuth
};
//# sourceMappingURL=authentication.js.map