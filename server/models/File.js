const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    path: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for project and path
FileSchema.index({ project: 1, path: 1 }, { unique: true });

// Update the updatedAt field before saving
FileSchema.pre('save', function(next) {
    this.updatedAt = new Date(Date.now());
    next();
});

module.exports = mongoose.model('File', FileSchema);

