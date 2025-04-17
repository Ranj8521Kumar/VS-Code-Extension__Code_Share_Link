const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    linkId: {
        type: String,
        unique: true,
        sparse: true
    },
    publicAccess: {
        type: Boolean,
        default: false
    },
    publicPermission: {
        type: String,
        enum: ['read', 'write', 'read-write'],
        default: 'read'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for name and owner
ProjectSchema.index({ name: 1, owner: 1 }, { unique: true });

module.exports = mongoose.model('Project', ProjectSchema);
