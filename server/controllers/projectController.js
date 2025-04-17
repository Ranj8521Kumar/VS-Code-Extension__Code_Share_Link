const Project = require('../models/Project');
const File = require('../models/File');
const Permission = require('../models/Permission');
const { v4: uuidv4 } = require('uuid');
const { io } = require('../server');

/**
 * Create a new project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createProject = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        // Check if project already exists for this user
        const existingProject = await Project.findOne({ name, owner: userId });
        if (existingProject) {
            return res.status(400).json({ message: 'Project already exists' });
        }

        // Create new project
        const project = new Project({
            name,
            owner: userId
        });

        // Save project
        await project.save();

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get all projects for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserProjects = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get projects owned by the user
        const ownedProjects = await Project.find({ owner: userId });

        // Get projects shared with the user
        const permissions = await Permission.find({ user: userId });
        const sharedProjectIds = permissions.map(permission => permission.project);
        const sharedProjects = await Project.find({ _id: { $in: sharedProjectIds } });

        // Combine and return projects
        const projects = [...ownedProjects, ...sharedProjects];
        res.json(projects);
    } catch (error) {
        console.error('Get user projects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get a specific project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        // Get project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        if (project.owner.toString() !== userId) {
            // Check if user has permission
            const permission = await Permission.findOne({ project: projectId, user: userId });
            if (!permission) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Generate a shareable link for a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateLink = async (req, res) => {
    try {
        const { projectName } = req.body;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName, owner: userId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Generate link ID if not exists
        if (!project.linkId) {
            project.linkId = uuidv4();
            await project.save();
        }

        // Generate link
        const link = `https://codesharelinkapp.com/project/${project.linkId}`;

        res.json({ link });
    } catch (error) {
        console.error('Generate link error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get project by link
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProjectByLink = async (req, res) => {
    try {
        const { linkId } = req.params;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ linkId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user is the owner
        if (project.owner.toString() !== userId) {
            // Check if user has permission
            const permission = await Permission.findOne({ project: project._id, user: userId });
            if (!permission && !project.publicAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        res.json(project);
    } catch (error) {
        console.error('Get project by link error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get project permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProjectPermissions = async (req, res) => {
    try {
        const { projectName } = req.params;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName, owner: userId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Get permissions
        const permissions = await Permission.find({ project: project._id }).populate('user', 'email');

        res.json({
            publicAccess: project.publicAccess,
            publicPermission: project.publicPermission,
            permissions: permissions.map(permission => ({
                email: permission.user.email,
                permission: permission.permission
            }))
        });
    } catch (error) {
        console.error('Get project permissions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Update project permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProjectPermissions = async (req, res) => {
    try {
        const { projectName } = req.params;
        const { permissions } = req.body;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName, owner: userId });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Update public access
        if (permissions.email === null) {
            project.publicAccess = true;
            project.publicPermission = permissions.permission;
            await project.save();
        } else {
            // Update specific user permission
            const User = require('../models/User');
            const user = await User.findOne({ email: permissions.email });
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if permission already exists
            let permission = await Permission.findOne({ project: project._id, user: user._id });
            
            if (permission) {
                // Update existing permission
                permission.permission = permissions.permission;
                await permission.save();
            } else {
                // Create new permission
                permission = new Permission({
                    project: project._id,
                    user: user._id,
                    permission: permissions.permission
                });
                await permission.save();
            }
        }

        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Update project permissions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Upload a file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadFile = async (req, res) => {
    try {
        const { projectName } = req.params;
        const { path, content } = req.body;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has write permission
        if (project.owner.toString() !== userId) {
            const permission = await Permission.findOne({ project: project._id, user: userId });
            
            if (!permission && !project.publicAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (permission && !['write', 'read-write'].includes(permission.permission)) {
                return res.status(403).json({ message: 'Write permission required' });
            }
            
            if (project.publicAccess && !['write', 'read-write'].includes(project.publicPermission)) {
                return res.status(403).json({ message: 'Write permission required' });
            }
        }

        // Check if file already exists
        let file = await File.findOne({ project: project._id, path });
        
        if (file) {
            // Update existing file
            file.content = content;
            file.version += 1;
            await file.save();
        } else {
            // Create new file
            file = new File({
                project: project._id,
                path,
                content,
                version: 1
            });
            await file.save();
        }

        // Notify clients about file update
        io.to(projectName).emit('file-updated', {
            projectName,
            filePath: path,
            content
        });

        res.json({ message: 'File uploaded successfully' });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Download a file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.downloadFile = async (req, res) => {
    try {
        const { projectName } = req.params;
        const { path } = req.query;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has read permission
        if (project.owner.toString() !== userId) {
            const permission = await Permission.findOne({ project: project._id, user: userId });
            
            if (!permission && !project.publicAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (permission && !['read', 'read-write'].includes(permission.permission)) {
                return res.status(403).json({ message: 'Read permission required' });
            }
            
            if (project.publicAccess && !['read', 'read-write'].includes(project.publicPermission)) {
                return res.status(403).json({ message: 'Read permission required' });
            }
        }

        // Get file
        const file = await File.findOne({ project: project._id, path });
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.json({ content: file.content });
    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Delete a file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteFile = async (req, res) => {
    try {
        const { projectName } = req.params;
        const { path } = req.query;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has write permission
        if (project.owner.toString() !== userId) {
            const permission = await Permission.findOne({ project: project._id, user: userId });
            
            if (!permission && !project.publicAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (permission && !['write', 'read-write'].includes(permission.permission)) {
                return res.status(403).json({ message: 'Write permission required' });
            }
            
            if (project.publicAccess && !['write', 'read-write'].includes(project.publicPermission)) {
                return res.status(403).json({ message: 'Write permission required' });
            }
        }

        // Delete file
        await File.findOneAndDelete({ project: project._id, path });

        // Notify clients about file deletion
        io.to(projectName).emit('file-deleted', {
            projectName,
            filePath: path
        });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get all files in a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProjectFiles = async (req, res) => {
    try {
        const { projectName } = req.params;
        const userId = req.user.id;

        // Get project
        const project = await Project.findOne({ name: projectName });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if user has read permission
        if (project.owner.toString() !== userId) {
            const permission = await Permission.findOne({ project: project._id, user: userId });
            
            if (!permission && !project.publicAccess) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            if (permission && !['read', 'read-write'].includes(permission.permission)) {
                return res.status(403).json({ message: 'Read permission required' });
            }
            
            if (project.publicAccess && !['read', 'read-write'].includes(project.publicPermission)) {
                return res.status(403).json({ message: 'Read permission required' });
            }
        }

        // Get files
        const files = await File.find({ project: project._id }, { path: 1, version: 1 });

        res.json(files);
    } catch (error) {
        console.error('Get project files error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
