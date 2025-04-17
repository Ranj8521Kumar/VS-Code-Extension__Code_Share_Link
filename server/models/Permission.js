const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    permission: {
        type: String,
        enum: ['read', 'write', 'read-write'],
        default: 'read'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for project and user
PermissionSchema.index({ project: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Permission', PermissionSchema);
