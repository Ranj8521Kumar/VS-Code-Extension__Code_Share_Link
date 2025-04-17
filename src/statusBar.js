const vscode = require('vscode');

/**
 * Initialize status bar
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {Object} auth - Authentication handler
 * @returns {Object} Status bar handler
 */
function initializeStatusBar(context, auth) {
    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'codeShareLink.showMenu';
    
    // Update status bar
    const updateStatusBar = () => {
        if (auth.isAuthenticated()) {
            statusBarItem.text = '$(link) Code Share Link';
            statusBarItem.tooltip = 'Code Share Link: Connected';
        } else {
            statusBarItem.text = '$(link) Code Share Link (Disconnected)';
            statusBarItem.tooltip = 'Code Share Link: Not connected. Click to log in.';
        }
        statusBarItem.show();
    };
    
    // Register command to show menu
    const showMenuCommand = vscode.commands.registerCommand('codeShareLink.showMenu', async () => {
        const items = [];
        
        if (auth.isAuthenticated()) {
            items.push(
                {
                    label: '$(link) Generate Shareable Link',
                    description: 'Create a shareable link for the current project',
                    command: 'codeShareLink.generateLink'
                },
                {
                    label: '$(shield) Manage Permissions',
                    description: 'Manage permissions for the current project',
                    command: 'codeShareLink.managePermissions'
                },
                {
                    label: '$(folder-opened) Open Shared Project',
                    description: 'Open a project shared with you',
                    command: 'codeShareLink.openSharedProject'
                },
                {
                    label: '$(sign-out) Log Out',
                    description: 'Log out from Code Share Link',
                    command: 'codeShareLink.logout'
                }
            );
        } else {
            items.push(
                {
                    label: '$(sign-in) Log In',
                    description: 'Log in to Code Share Link',
                    command: 'codeShareLink.login'
                }
            );
        }
        
        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: 'Code Share Link'
        });
        
        if (selectedItem) {
            vscode.commands.executeCommand(selectedItem.command);
        }
    });
    
    // Register login command
    const loginCommand = vscode.commands.registerCommand('codeShareLink.login', async () => {
        const didAuthenticate = await auth.authenticate();
        if (didAuthenticate) {
            updateStatusBar();
            vscode.window.showInformationMessage('Successfully logged in to Code Share Link!');
        }
    });
    
    // Register logout command
    const logoutCommand = vscode.commands.registerCommand('codeShareLink.logout', async () => {
        auth.logout();
        updateStatusBar();
        vscode.window.showInformationMessage('Logged out from Code Share Link.');
    });
    
    // Add to subscriptions
    context.subscriptions.push(statusBarItem, showMenuCommand, loginCommand, logoutCommand);
    
    // Initial update
    updateStatusBar();
    
    return {
        updateStatusBar
    };
}

module.exports = {
    initializeStatusBar
};
