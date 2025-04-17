const assert = require('assert');
const vscode = require('vscode');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('publisher.codeShareLink'));
    });

    test('Should register commands', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('codeShareLink.generateLink'));
        assert.ok(commands.includes('codeShareLink.managePermissions'));
    });
});
