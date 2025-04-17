const vscode = require('vscode');
const path = require('path');
const { showPermissionsQuickPick, showLinkInputBox, showProjectPicker } = require('./ui');

/**
 * Register all extension commands
 * @param {vscode.ExtensionContext} context
 * @param {Object} api - API client
 * @param {Object} auth - Authentication handler
 * @param {Object} fileSync - File synchronization handler
 */
function registerCommands(context, api, auth, fileSync) {
    // Command to generate a shareable link
    const generateLinkCommand = vscode.commands.registerCommand('codeShareLink.generateLink', async () => {
        try {
            // Check if user is authenticated
            if (!auth.isAuthenticated()) {
                const didAuthenticate = await auth.authenticate();
                if (!didAuthenticate) {
                    vscode.window.showErrorMessage('Authentication required to generate a shareable link.');
                    return;
                }
            }

            // Get current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open.');
                return;
            }

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating shareable link...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });

                // Upload project files
                await fileSync.uploadProject(workspaceFolder.uri);
                progress.report({ increment: 50 });

                // Generate link
                const link = await api.generateLink(workspaceFolder.name);
                progress.report({ increment: 50 });

                // Show link to user
                const copyAction = 'Copy to Clipboard';
                const manageAction = 'Manage Permissions';
                const selectedAction = await vscode.window.showInformationMessage(
                    `Shareable link generated: ${link}`,
                    copyAction,
                    manageAction
                );

                if (selectedAction === copyAction) {
                    await vscode.env.clipboard.writeText(link);
                    vscode.window.showInformationMessage('Link copied to clipboard!');
                } else if (selectedAction === manageAction) {
                    vscode.commands.executeCommand('codeShareLink.managePermissions');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating link: ${error.message}`);
        }
    });

    // Command to manage permissions
    const managePermissionsCommand = vscode.commands.registerCommand('codeShareLink.managePermissions', async () => {
        try {
            // Check if user is authenticated
            if (!auth.isAuthenticated()) {
                const didAuthenticate = await auth.authenticate();
                if (!didAuthenticate) {
                    vscode.window.showErrorMessage('Authentication required to manage permissions.');
                    return;
                }
            }

            // Get current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open.');
                return;
            }

            // Get current project permissions
            const permissions = await api.getProjectPermissions(workspaceFolder.name);

            // Show permissions UI
            const newPermission = await showPermissionsQuickPick(permissions);
            if (newPermission) {
                await api.updateProjectPermissions(workspaceFolder.name, newPermission);
                vscode.window.showInformationMessage('Permissions updated successfully!');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error managing permissions: ${error.message}`);
        }
    });

    // Command to open a shared project
    const openSharedProjectCommand = vscode.commands.registerCommand('codeShareLink.openSharedProject', async () => {
        try {
            // Check if user is authenticated
            if (!auth.isAuthenticated()) {
                const didAuthenticate = await auth.authenticate();
                if (!didAuthenticate) {
                    vscode.window.showErrorMessage('Authentication required to open a shared project.');
                    return;
                }
            }

            // Ask for link or show project picker
            const linkOrPicker = await vscode.window.showQuickPick(
                ['Enter a shared link', 'Select from shared projects'],
                { placeHolder: 'How would you like to open a shared project?' }
            );

            if (!linkOrPicker) {
                return;
            }

            let projectId;
            let projectName;

            if (linkOrPicker === 'Enter a shared link') {
                // Get link from user
                const link = await showLinkInputBox();
                if (!link) {
                    return;
                }

                // Extract project ID from link
                console.log('Link entered by user:', link);

                // Support multiple link formats
                let match = link.match(/project\/([a-zA-Z0-9-]+)/);
                if (!match || !match[1]) {
                    // Try alternative format
                    match = link.match(/([a-zA-Z0-9-]{8})/);
                }

                if (!match || !match[1]) {
                    vscode.window.showErrorMessage('Invalid link format. Please enter a valid project link or ID.');
                    return;
                }

                projectId = match[1];
                console.log('Extracted project ID:', projectId);

                // Get project info
                const project = await api.getProjectByLink(projectId);
                projectName = project.name;
            } else {
                // Get shared projects
                const projects = await api.getSharedProjects();
                if (!projects || projects.length === 0) {
                    vscode.window.showErrorMessage('No shared projects found.');
                    return;
                }

                // Show project picker
                const project = await showProjectPicker(projects);
                if (!project) {
                    return;
                }

                projectId = project._id;
                projectName = project.name;
            }

            // Ask for download location
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Download Location'
            });

            if (!folderUri || folderUri.length === 0) {
                return;
            }

            // Create project folder
            const projectFolderUri = vscode.Uri.file(path.join(folderUri[0].fsPath, projectName));

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Opening shared project...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });

                // Download project
                await fileSync.downloadProject(projectName, projectFolderUri);
                progress.report({ increment: 100 });

                // Open project in new window
                const openInCurrentWindow = await vscode.window.showInformationMessage(
                    `Project downloaded to ${projectFolderUri.fsPath}. Open in new window?`,
                    'Yes', 'No'
                );

                if (openInCurrentWindow === 'Yes') {
                    await vscode.commands.executeCommand('vscode.openFolder', projectFolderUri, true);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening shared project: ${error.message}`);
        }
    });

    context.subscriptions.push(generateLinkCommand, managePermissionsCommand, openSharedProjectCommand);
}

module.exports = {
    registerCommands
};
