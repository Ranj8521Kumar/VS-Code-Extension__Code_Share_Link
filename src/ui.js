const vscode = require('vscode');

/**
 * Show permissions quick pick
 * @param {Object} currentPermissions - Current permissions
 * @returns {Promise<Object|undefined>} Selected permissions or undefined if cancelled
 */
async function showPermissionsQuickPick(currentPermissions) {
    // Define permission options
    const permissionOptions = [
        {
            label: 'Read-only',
            description: 'Users can only view the code',
            detail: 'Users cannot make any changes to the code',
            value: 'read'
        },
        {
            label: 'Read-write',
            description: 'Users can view and edit the code',
            detail: 'Users can make changes to the code',
            value: 'read-write'
        },
        {
            label: 'Write-only',
            description: 'Users can only edit the code',
            detail: 'Users cannot view the code without making changes',
            value: 'write'
        }
    ];
    
    // Set current permission as selected
    const currentPermission = currentPermissions?.permission || 'read';
    permissionOptions.forEach(option => {
        if (option.value === currentPermission) {
            option.picked = true;
        }
    });
    
    // Show quick pick
    const selectedOption = await vscode.window.showQuickPick(permissionOptions, {
        placeHolder: 'Select permission level for shared link',
        ignoreFocusOut: true
    });
    
    if (!selectedOption) {
        return undefined;
    }
    
    // Get email for specific user permission
    const isSpecificUser = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Set permission for a specific user?',
        ignoreFocusOut: true
    });
    
    let email = null;
    if (isSpecificUser === 'Yes') {
        email = await vscode.window.showInputBox({
            prompt: 'Enter user email',
            placeHolder: 'email@example.com',
            validateInput: (value) => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address';
            },
            ignoreFocusOut: true
        });
        
        if (!email) {
            return undefined;
        }
    }
    
    // Return selected permission
    return {
        permission: selectedOption.value,
        email
    };
}

/**
 * Show project picker
 * @param {Array<Object>} projects - List of projects
 * @returns {Promise<Object|undefined>} Selected project or undefined if cancelled
 */
async function showProjectPicker(projects) {
    // Map projects to quick pick items
    const projectItems = projects.map(project => ({
        label: project.name,
        description: `Created on ${new Date(project.createdAt).toLocaleDateString()}`,
        detail: `Owner: ${project.owner}`,
        project
    }));
    
    // Show quick pick
    const selectedItem = await vscode.window.showQuickPick(projectItems, {
        placeHolder: 'Select a project to open',
        ignoreFocusOut: true
    });
    
    return selectedItem?.project;
}

/**
 * Show link input box
 * @returns {Promise<string|undefined>} Link or undefined if cancelled
 */
async function showLinkInputBox() {
    return vscode.window.showInputBox({
        prompt: 'Enter the shared link',
        placeHolder: 'https://codesharelinkapp.com/project/abc123',
        validateInput: (value) => {
            return value.startsWith('https://codesharelinkapp.com/project/') ? null : 'Please enter a valid Code Share Link';
        },
        ignoreFocusOut: true
    });
}

module.exports = {
    showPermissionsQuickPick,
    showProjectPicker,
    showLinkInputBox
};
