const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const { io } = require('socket.io-client');
/**
 * Simple pattern matching function to replace minimatch
 * @param {string} filePath - File path to check
 * @param {string} pattern - Pattern to match against
 * @returns {boolean} - Whether the file path matches the pattern
 */
function matchPattern(filePath, pattern) {
    // Handle special case for node_modules
    if (pattern === 'node_modules/**' && filePath.startsWith('node_modules/')) {
        return true;
    }
    // Handle special case for .git
    if (pattern === '.git/**' && filePath.startsWith('.git/')) {
        return true;
    }
    // Handle special case for dist
    if (pattern === 'dist/**' && filePath.startsWith('dist/')) {
        return true;
    }
    // Handle special case for build
    if (pattern === 'build/**' && filePath.startsWith('build/')) {
        return true;
    }
    // Handle special case for out
    if (pattern === 'out/**' && filePath.startsWith('out/')) {
        return true;
    }
    // Handle special case for log files
    if (pattern === '*.log' && filePath.endsWith('.log')) {
        return true;
    }
    // For other patterns, use a simple string comparison
    return filePath === pattern;
}
/**
 * Initialize file synchronization
 * @param {Object} api - API client
 * @param {Object} auth - Authentication handler
 * @returns {Object} File synchronization handler
 */
function initializeFileSync(api, auth) {
    let socket = null;
    let isConnected = false;
    let currentProject = null;
    // Get configuration
    const config = vscode.workspace.getConfiguration('codeShareLink');
    const apiUrl = config.get('apiUrl') || 'https://api.codesharelinkapp.com';
    /**
     * Connect to WebSocket server for real-time updates
     */
    const connectToWebSocket = () => {
        if (!auth.isAuthenticated()) {
            return;
        }
        // Disconnect existing socket if any
        if (socket) {
            socket.disconnect();
        }
        // Connect to WebSocket server
        socket = io(apiUrl, {
            auth: {
                token: auth.getToken()
            }
        });
        // Handle connection events
        socket.on('connect', () => {
            isConnected = true;
            console.log('Connected to WebSocket server');
            // Join project room if a project is open
            if (currentProject) {
                socket.emit('join-project', { projectName: currentProject });
            }
        });
        socket.on('disconnect', () => {
            isConnected = false;
            console.log('Disconnected from WebSocket server');
        });
        // Handle file update events
        socket.on('file-updated', async (data) => {
            try {
                const { projectName, filePath, content } = data;
                // Only process updates for the current project
                if (projectName !== currentProject) {
                    return;
                }
                // Get workspace folder
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    return;
                }
                // Create file path
                const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
                // Ensure directory exists
                const directory = path.dirname(fullPath);
                await mkdir(directory, { recursive: true });
                // Write file
                await writeFile(fullPath, content);
                // Show notification
                vscode.window.showInformationMessage(`File ${filePath} updated by another user.`);
            }
            catch (error) {
                console.error('Error processing file update:', error);
            }
        });
    };
    /**
     * Upload a project to the server
     * @param {vscode.Uri} workspaceUri - URI of the workspace folder
     * @returns {Promise<void>}
     */
    const uploadProject = async (workspaceUri) => {
        try {
            // Get project name from workspace folder
            const projectName = path.basename(workspaceUri.fsPath);
            currentProject = projectName;
            // Get all files in the workspace
            const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
            // Get exclude patterns from configuration
            const excludePatterns = config.get('codeShareLink.excludePatterns') || [
                'node_modules/**',
                '.git/**',
                'dist/**',
                'build/**',
                'out/**',
                '*.log'
            ];
            // Add additional exclude patterns for large files
            const maxFileSizeKB = 1024; // 1MB max file size
            // Upload each file
            for (const file of files) {
                // Skip directories
                const stat = fs.statSync(file.fsPath);
                if (stat.isDirectory()) {
                    continue;
                }
                // Get relative path and normalize it to use forward slashes
                let relativePath = path.relative(workspaceUri.fsPath, file.fsPath);
                // Convert Windows backslashes to forward slashes
                relativePath = relativePath.replace(/\\/g, '/');
                // Check if file should be excluded
                const shouldExclude = excludePatterns.some(pattern => {
                    return matchPattern(relativePath, pattern);
                });
                if (shouldExclude) {
                    console.log(`Skipping excluded file: ${relativePath}`);
                    continue;
                }
                // Check file size
                const fileSizeKB = stat.size / 1024;
                if (fileSizeKB > maxFileSizeKB) {
                    console.log(`Skipping large file (${fileSizeKB.toFixed(2)} KB): ${relativePath}`);
                    vscode.window.showWarningMessage(`Skipped large file: ${relativePath} (${fileSizeKB.toFixed(2)} KB)`);
                    continue;
                }
                try {
                    // Read file content - try utf8 first
                    let content;
                    try {
                        content = await readFile(file.fsPath, 'utf8');
                    }
                    catch (readError) {
                        // If utf8 fails, try binary encoding
                        console.log(`Failed to read ${relativePath} as utf8, trying binary...`);
                        const buffer = await readFile(file.fsPath);
                        content = buffer.toString('base64');
                        console.log(`Read ${relativePath} as base64 (${content.length} chars)`);
                    }
                    // Upload file
                    await api.uploadFile(projectName, relativePath, content);
                    console.log(`Successfully uploaded ${relativePath}`);
                }
                catch (error) {
                    console.error(`Error uploading file ${relativePath}:`, error);
                    vscode.window.showWarningMessage(`Failed to upload file: ${relativePath}`);
                }
            }
            // Connect to WebSocket for real-time updates
            if (!isConnected) {
                connectToWebSocket();
            }
            else if (socket) {
                socket.emit('join-project', { projectName });
            }
        }
        catch (error) {
            console.error('Error uploading project:', error);
            throw error;
        }
    };
    /**
     * Download a project from the server
     * @param {string} projectName - Name of the project
     * @param {vscode.Uri} targetUri - URI of the target folder
     * @returns {Promise<void>}
     */
    const downloadProject = async (projectName, targetUri) => {
        try {
            console.log(`Downloading project: ${projectName}`);
            console.log(`Target directory: ${targetUri.fsPath}`);
            // Get project files
            const files = await api.getProjectFiles(projectName);
            console.log(`Retrieved ${files.length} files from server`);
            if (files.length === 0) {
                console.log('No files found for project');
                // Create a README file to avoid empty project
                const readmePath = path.join(targetUri.fsPath, 'README.md');
                await writeFile(readmePath, `# ${projectName}\n\nThis project was shared with Code Share Link.`);
                console.log('Created README.md file');
            }
            else {
                // Download each file
                for (const file of files) {
                    try {
                        console.log(`Downloading file: ${file.path}`);
                        // Get file content
                        const content = await api.downloadFile(projectName, file.path);
                        // Create file path
                        const fullPath = path.join(targetUri.fsPath, file.path);
                        // Ensure directory exists
                        const directory = path.dirname(fullPath);
                        await mkdir(directory, { recursive: true });
                        // Write file
                        await writeFile(fullPath, content);
                        console.log(`Successfully wrote file: ${fullPath}`);
                    }
                    catch (fileError) {
                        console.error(`Error downloading file ${file.path}:`, fileError);
                        // Continue with other files
                    }
                }
            }
            // Set current project
            currentProject = projectName;
            console.log(`Set current project to: ${projectName}`);
            // Connect to WebSocket for real-time updates
            if (!isConnected) {
                connectToWebSocket();
            }
            else if (socket) {
                socket.emit('join-project', { projectName });
            }
        }
        catch (error) {
            console.error('Error downloading project:', error);
            throw error;
        }
    };
    // Register file system watcher to detect changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    // Handle file creation
    watcher.onDidCreate(async (uri) => {
        try {
            // Skip if not authenticated or no project is open
            if (!auth.isAuthenticated() || !currentProject) {
                return;
            }
            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }
            // Skip directories
            const stat = fs.statSync(uri.fsPath);
            if (stat.isDirectory()) {
                return;
            }
            // Read file content
            const content = await readFile(uri.fsPath, 'utf8');
            // Get relative path and normalize it to use forward slashes
            let relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
            // Convert Windows backslashes to forward slashes
            relativePath = relativePath.replace(/\\/g, '/');
            // Upload file
            await api.uploadFile(currentProject, relativePath, content);
        }
        catch (error) {
            console.error('Error handling file creation:', error);
        }
    });
    // Handle file changes
    watcher.onDidChange(async (uri) => {
        try {
            // Skip if not authenticated or no project is open
            if (!auth.isAuthenticated() || !currentProject) {
                return;
            }
            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }
            // Skip directories
            const stat = fs.statSync(uri.fsPath);
            if (stat.isDirectory()) {
                return;
            }
            // Get relative path and normalize it to use forward slashes
            let relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
            // Convert Windows backslashes to forward slashes
            relativePath = relativePath.replace(/\\/g, '/');
            // Read file content - try utf8 first
            let content;
            try {
                content = await readFile(uri.fsPath, 'utf8');
            }
            catch (readError) {
                // If utf8 fails, try binary encoding
                console.log(`Failed to read ${relativePath} as utf8, trying binary...`);
                const buffer = await readFile(uri.fsPath);
                content = buffer.toString('base64');
                console.log(`Read ${relativePath} as base64 (${content.length} chars)`);
            }
            // Upload file
            await api.uploadFile(currentProject, relativePath, content);
        }
        catch (error) {
            console.error('Error handling file change:', error);
        }
    });
    // Handle file deletion
    watcher.onDidDelete(async (uri) => {
        try {
            // Skip if not authenticated or no project is open
            if (!auth.isAuthenticated() || !currentProject) {
                return;
            }
            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }
            // Get relative path and normalize it to use forward slashes
            let relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
            // Convert Windows backslashes to forward slashes
            relativePath = relativePath.replace(/\\/g, '/');
            // Delete file
            await api.deleteFile(currentProject, relativePath);
        }
        catch (error) {
            console.error('Error handling file deletion:', error);
        }
    });
    return {
        uploadProject,
        downloadProject,
        connectToWebSocket
    };
}
module.exports = {
    initializeFileSync
};
//# sourceMappingURL=fileSync.js.map