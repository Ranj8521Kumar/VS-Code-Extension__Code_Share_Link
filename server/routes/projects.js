const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a new project
router.post('/', projectController.createProject);

// Get all projects for the authenticated user
router.get('/', projectController.getUserProjects);

// Get a specific project
router.get('/:projectId', projectController.getProject);

// Generate a shareable link for a project
router.post('/link', projectController.generateLink);

// Get project by link
router.get('/link/:linkId', projectController.getProjectByLink);

// Get project permissions
router.get('/:projectName/permissions', projectController.getProjectPermissions);

// Update project permissions
router.put('/:projectName/permissions', projectController.updateProjectPermissions);

// Upload a file
router.put('/:projectName/files', projectController.uploadFile);

// Download a file
router.get('/:projectName/files', projectController.downloadFile);

// Delete a file
router.delete('/:projectName/files', projectController.deleteFile);

// Get all files in a project
router.get('/:projectName/files/all', projectController.getProjectFiles);

module.exports = router;
