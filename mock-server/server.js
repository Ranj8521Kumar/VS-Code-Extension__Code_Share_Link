// @ts-nocheck - Disable TypeScript checking for this file
// This is a mock server for development purposes only
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Create Express app
const app = express();
const PORT = 3002; // Changed port to 3002 to avoid conflicts

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// In-memory storage
const users = [];
const projects = {};
const tokens = {};
const links = {};

// Authentication endpoints
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Simple mock authentication
  if (email && password) {
    const token = uuidv4();
    tokens[token] = { email, timestamp: Date.now() };

    console.log(`User logged in: ${email}`);
    return res.json({ token });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

app.post('/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    users.push({ email, password });
    const token = uuidv4();
    tokens[token] = { email, timestamp: Date.now() };

    console.log(`User registered: ${email}`);
    return res.json({ token });
  }

  return res.status(400).json({ message: 'Email and password required' });
});

// Project endpoints
app.post('/projects/link', (req, res) => {
  try {
    console.log('Link generation request received');
    console.log('Request body:', req.body);

    const { projectName } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    console.log('Project name:', projectName);
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token || !tokens[token]) {
      console.log('Unauthorized: Invalid token');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!projectName) {
      console.log('Project name required');
      return res.status(400).json({ message: 'Project name required' });
    }

    // Create project if it doesn't exist
    if (!projects[projectName]) {
      console.log(`Creating new project: ${projectName}`);
      projects[projectName] = {
        name: projectName,
        owner: tokens[token].email,
        files: {},
        permissions: { read: true, write: false }
      };
    } else {
      console.log(`Project already exists: ${projectName}`);
    }

    // Generate link
    const linkId = uuidv4().substring(0, 8);
    links[linkId] = projectName;

    const link = `https://codesharelinkapp.com/project/${linkId}`;
    console.log(`Link generated for project ${projectName}: ${link}`);

    return res.json({ link });
  } catch (error) {
    console.error('Error generating link:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/projects/:projectName/permissions', (req, res) => {
  const { projectName } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !tokens[token]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!projects[projectName]) {
    return res.status(404).json({ message: 'Project not found' });
  }

  return res.json(projects[projectName].permissions);
});

app.put('/projects/:projectName/permissions', (req, res) => {
  const { projectName } = req.params;
  const { permissions } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !tokens[token]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!projects[projectName]) {
    return res.status(404).json({ message: 'Project not found' });
  }

  projects[projectName].permissions = permissions;
  console.log(`Permissions updated for project ${projectName}:`, permissions);

  return res.sendStatus(200);
});

// File endpoints
app.put('/projects/:projectName/files', (req, res) => {
  try {
    console.log('File upload request received for project:', req.params.projectName);
    console.log('Request body keys:', Object.keys(req.body));

    const { projectName } = req.params;
    const { filePath, content } = req.body; // Changed 'path' to 'filePath' to avoid conflicts

    console.log('File path:', filePath);
    console.log('Content type:', typeof content);
    console.log('Content length:', content ? content.length : 0);

    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token || !tokens[token]) {
      console.log('Unauthorized: Invalid token');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!projects[projectName]) {
      console.log('Project not found:', projectName);
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!filePath) {
      console.log('File path required');
      return res.status(400).json({ message: 'File path required' });
    }

    // Check if content is too large (optional, since we already increased the limit)
    if (content && typeof content === 'string' && content.length > 10 * 1024 * 1024) { // 10MB
      console.log('File content too large:', content.length);
      return res.status(413).json({ message: 'File content too large' });
    }

    // Initialize files object if it doesn't exist
    if (!projects[projectName].files) {
      projects[projectName].files = {};
    }

    projects[projectName].files[filePath] = content;
    console.log(`File uploaded to project ${projectName}: ${filePath}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/projects/:projectName/files', (req, res) => {
  try {
    const { projectName } = req.params;
    const filePath = req.query.filePath ? String(req.query.filePath) : '';
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !tokens[token]) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!projects[projectName]) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!filePath || !projects[projectName].files[filePath]) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.json({ content: projects[projectName].files[filePath] });
  } catch (error) {
    console.error('Error getting file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/projects/:projectName/files/all', (req, res) => {
  try {
    console.log('Get all files request received');
    console.log('Project name:', req.params.projectName);

    const { projectName } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token || !tokens[token]) {
      console.log('Unauthorized: Invalid token');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Available projects:', Object.keys(projects));
    if (!projects[projectName]) {
      console.log(`Project not found: ${projectName}`);
      return res.status(404).json({ message: 'Project not found' });
    }

    // Ensure files object exists
    if (!projects[projectName].files) {
      console.log(`No files object for project: ${projectName}`);
      projects[projectName].files = {};
    }

    const files = Object.keys(projects[projectName].files).map(filePath => ({
      path: filePath,
      size: projects[projectName].files[filePath].length
    }));

    console.log(`Found ${files.length} files for project ${projectName}`);
    return res.json(files);
  } catch (error) {
    console.error('Error getting all files:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.delete('/projects/:projectName/files', (req, res) => {
  try {
    const { projectName } = req.params;
    const filePath = req.query.filePath ? String(req.query.filePath) : '';
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !tokens[token]) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!projects[projectName]) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!filePath || !projects[projectName].files[filePath]) {
      return res.status(404).json({ message: 'File not found' });
    }

    delete projects[projectName].files[filePath];
    console.log(`File deleted from project ${projectName}: ${filePath}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Link endpoints
app.get('/projects/link/:linkId', (req, res) => {
  try {
    console.log('Get project by link request received');
    console.log('Link ID:', req.params.linkId);
    console.log('Available links:', Object.keys(links));

    const { linkId } = req.params;

    if (!links[linkId]) {
      console.log(`Link not found: ${linkId}`);
      return res.status(404).json({ message: 'Link not found' });
    }

    const projectName = links[linkId];
    console.log(`Project name from link: ${projectName}`);
    console.log('Available projects:', Object.keys(projects));

    if (!projects[projectName]) {
      console.log(`Project not found: ${projectName}`);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log(`Returning project: ${projectName}`);
    return res.json(projects[projectName]);
  } catch (error) {
    console.error('Error getting project by link:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get all projects
app.get('/projects', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !tokens[token]) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userEmail = tokens[token].email;
    const userProjects = Object.values(projects).filter(project =>
      project.owner === userEmail
    );

    return res.json(userProjects);
  } catch (error) {
    console.error('Error getting all projects:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /auth/login');
  console.log('  POST /auth/register');
  console.log('  POST /projects/link');
  console.log('  GET /projects/:projectName/permissions');
  console.log('  PUT /projects/:projectName/permissions');
  console.log('  PUT /projects/:projectName/files');
  console.log('  GET /projects/:projectName/files');
  console.log('  GET /projects/:projectName/files/all');
  console.log('  DELETE /projects/:projectName/files');
  console.log('  GET /projects/link/:linkId');
  console.log('  GET /projects');
});
