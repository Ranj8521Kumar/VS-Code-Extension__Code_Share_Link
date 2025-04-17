// No direct vscode import needed as it's used in the imported modules
const { registerCommands } = require('./src/commands');
const { initializeApi } = require('./src/api');
const { initializeFileSync } = require('./src/fileSync');
const { initializeAuth } = require('./src/authentication');
const { initializeStatusBar } = require('./src/statusBar');
function activate(context) {
    console.log('Code Share Link extension is now active!');
    // Initialize API client
    const api = initializeApi();
    // Initialize authentication
    const auth = initializeAuth(context, api);
    // Initialize file synchronization
    const fileSync = initializeFileSync(api, auth);
    // Initialize status bar
    const statusBar = initializeStatusBar(context, auth);
    // Register commands
    registerCommands(context, api, auth, fileSync);
    // Update status bar when authentication state changes
    auth.onAuthenticationChanged(() => {
        statusBar.updateStatusBar();
    });
}
// Removed redundant export to avoid redeclaration error
function deactivate() { }
module.exports = {
    activate,
    deactivate
};
//# sourceMappingURL=extension.js.map