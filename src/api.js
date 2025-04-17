const axios = require('axios');

/**
 * Initialize the API client
 * @returns {Object} API client object
 */
function initializeApi() {
    // Use local server for development
    const apiUrl = 'http://localhost:3002'; // Updated to match the new port

    // Create axios instance
    const axiosInstance = axios.create({
        baseURL: apiUrl,
        timeout: 30000
    });

    // Add authentication token to requests
    axiosInstance.interceptors.request.use(config => {
        // Use direct token retrieval instead of trying to access through extension
        // This will be passed from the authentication module
        const token = getAuthToken();
        if (token) {
            // For our mock server, we need to use the Bearer format
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    return {
        /**
         * Generate a shareable link for a project
         * @param {string} projectName - Name of the project
         * @returns {Promise<string>} Shareable link
         */
        generateLink: async (projectName) => {
            try {
                // Our mock server expects this endpoint without /api prefix
                const response = await axiosInstance.post('/projects/link', { projectName });
                return response.data.link;
            } catch (error) {
                console.error('Error generating link:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Get project permissions
         * @param {string} projectName - Name of the project
         * @returns {Promise<Object>} Project permissions
         */
        getProjectPermissions: async (projectName) => {
            try {
                const response = await axiosInstance.get(`/projects/${encodeURIComponent(projectName)}/permissions`);
                return response.data;
            } catch (error) {
                console.error('Error getting permissions:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Update project permissions
         * @param {string} projectName - Name of the project
         * @param {Object} permissions - New permissions
         * @returns {Promise<void>}
         */
        updateProjectPermissions: async (projectName, permissions) => {
            try {
                await axiosInstance.put(`/projects/${encodeURIComponent(projectName)}/permissions`, { permissions });
            } catch (error) {
                console.error('Error updating permissions:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Upload a file
         * @param {string} projectName - Name of the project
         * @param {string} filePath - Path of the file
         * @param {string} content - Content of the file
         * @returns {Promise<void>}
         */
        uploadFile: async (projectName, filePath, content) => {
            try {
                // For our mock server, we need to create the project first if it doesn't exist
                try {
                    // Try to get project permissions to check if it exists
                    await axiosInstance.get(`/projects/${encodeURIComponent(projectName)}/permissions`);
                } catch (err) {
                    if (err.response?.status === 404) {
                        // Project doesn't exist, create it by generating a link
                        console.log(`Project ${projectName} doesn't exist, creating it...`);
                        await axiosInstance.post('/projects/link', { projectName });
                    }
                }

                // Now upload the file
                await axiosInstance.put(`/projects/${encodeURIComponent(projectName)}/files`, {
                    filePath: filePath,
                    content
                });
            } catch (error) {
                console.error(`Error uploading file ${filePath}:`, error);
                if (error.response) {
                    console.error('Response data:', error.response.data);
                    console.error('Status code:', error.response.status);
                }
                throw new Error(`Error uploading file ${filePath}: ${error.response?.data?.message || error.message}`);
            }
        },

        /**
         * Download a file
         * @param {string} projectName - Name of the project
         * @param {string} filePath - Path of the file
         * @returns {Promise<string>} File content
         */
        downloadFile: async (projectName, filePath) => {
            try {
                const response = await axiosInstance.get(`/projects/${encodeURIComponent(projectName)}/files`, {
                    params: { filePath: filePath }
                });
                return response.data.content;
            } catch (error) {
                console.error('Error downloading file:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Authenticate user
         * @param {string} email - User email
         * @param {string} password - User password
         * @returns {Promise<string>} Authentication token
         */
        authenticate: async (email, password) => {
            try {
                const response = await axiosInstance.post('/auth/login', { email, password });
                return response.data.token;
            } catch (error) {
                console.error('Error authenticating:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Register user
         * @param {string} email - User email
         * @param {string} password - User password
         * @returns {Promise<string>} Authentication token
         */
        register: async (email, password) => {
            try {
                const response = await axiosInstance.post('/auth/register', { email, password });
                return response.data.token;
            } catch (error) {
                console.error('Error registering:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Get project by link ID
         * @param {string} linkId - Link ID of the project
         * @returns {Promise<Object>} Project information
         */
        getProjectByLink: async (linkId) => {
            try {
                const response = await axiosInstance.get(`/projects/link/${linkId}`);
                return response.data;
            } catch (error) {
                console.error('Error getting project by link:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Get all projects shared with the user
         * @returns {Promise<Array<Object>>} List of shared projects
         */
        getSharedProjects: async () => {
            try {
                const response = await axiosInstance.get('/projects');
                return response.data;
            } catch (error) {
                console.error('Error getting shared projects:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Get all files in a project
         * @param {string} projectName - Name of the project
         * @returns {Promise<Array<Object>>} List of files
         */
        getProjectFiles: async (projectName) => {
            try {
                const response = await axiosInstance.get(`/projects/${encodeURIComponent(projectName)}/files/all`);
                return response.data;
            } catch (error) {
                console.error('Error getting project files:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        },

        /**
         * Delete a file
         * @param {string} projectName - Name of the project
         * @param {string} filePath - Path of the file
         * @returns {Promise<void>}
         */
        deleteFile: async (projectName, filePath) => {
            try {
                await axiosInstance.delete(`/projects/${encodeURIComponent(projectName)}/files`, {
                    params: { filePath: filePath }
                });
            } catch (error) {
                console.error('Error deleting file:', error);
                throw new Error(error.response?.data?.message || error.message);
            }
        }
    };
}

// Token storage for the API module
let authToken = null;

/**
 * Get authentication token from storage
 * @returns {string|null} Authentication token
 */
function getAuthToken() {
    return authToken;
}

/**
 * Set authentication token
 * @param {string} token - Authentication token
 */
function setAuthToken(token) {
    authToken = token;
}

module.exports = {
    initializeApi,
    setAuthToken
};

