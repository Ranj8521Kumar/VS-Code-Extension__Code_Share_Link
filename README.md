# Code Share Link

A VS Code extension that allows you to share your code via links with customizable permissions. Unlike Live Share, Code Share Link allows users to access shared code even when the host is offline, providing persistent access through shareable links with fine-grained permission controls.

## Features

- Generate shareable links for your projects
- Set custom permissions for shared links (read-only, write-only, read-write)
- Assign permissions to specific users
- Real-time collaboration with WebSocket synchronization
- Secure authentication system
- Persistent access to shared code (no need for the host to be online)
- Automatic synchronization of changes
- Version history tracking

## How to Use

### Generate a Shareable Link

1. Open a project in VS Code
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette
3. Type "Generate Shareable Link" and select the command
4. If you're not logged in, you'll be prompted to log in or register
5. The extension will upload your project files and generate a shareable link
6. Copy the link and share it with others

### Manage Permissions

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette
2. Type "Manage Link Permissions" and select the command
3. Select the permission level (read-only, write-only, read-write)
4. Choose whether to set the permission for a specific user or for anyone with the link
5. If you choose a specific user, enter their email address

### Open a Shared Project

1. Receive a shared link from someone
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the Command Palette
4. Type "Open Shared Project" and select the command
5. Enter the shared link
6. The project will be downloaded and opened in VS Code

## Requirements

- VS Code 1.60.0 or higher
- Internet connection
- Node.js 14.x or higher (for development)

## Extension Settings

This extension contributes the following settings:

* `codeShareLink.apiUrl`: URL of the Code Share Link API server

## Known Issues

- Large projects may take a long time to upload
- Binary files are not supported yet
- Limited to 100MB total project size

## Release Notes

### 0.1.0

Initial release of Code Share Link

## Development

### Building the Extension

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the TypeScript code
4. Press F5 to launch the extension in debug mode

### Backend Server

The extension requires a backend server to function. The server code is available in the `server` directory.

To run the server locally:

1. Navigate to the `server` directory
2. Run `npm install` to install dependencies
3. Create a `.env` file based on `.env.example`
4. Run `npm start` to start the server
5. Update the `codeShareLink.apiUrl` setting in VS Code to point to your local server

### Architecture

Code Share Link consists of two main components:

1. **VS Code Extension**: The client-side component that integrates with VS Code
   - Handles file synchronization
   - Manages authentication
   - Provides UI for generating links and setting permissions

2. **Backend Server**: A Node.js server that handles file storage, user authentication, and permission management
   - RESTful API for file operations
   - WebSocket server for real-time synchronization
   - MongoDB database for storing project data, user information, and permissions

### How It Differs from Live Share

Unlike Live Share, which requires the host to be online for collaboration, Code Share Link:

- Stores project files on a server, allowing access even when the host is offline
- Provides persistent links that can be accessed anytime
- Offers fine-grained permission controls (read, write, read-write)
- Allows assigning different permissions to different users
- Tracks version history of files

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Privacy

This extension uploads your code to our servers to enable sharing. Please do not share sensitive information or credentials.

## Support

For support, please open an issue on the GitHub repository or contact us at ranjankumarpandit92054@gmail.com.
