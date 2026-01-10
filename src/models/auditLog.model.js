const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['auth', 'attendance', 'payment', 'event', 'user', 'system'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// Static method to log action
auditLogSchema.statics.logAction = function(actionData) {
  return this.create({
    ...actionData,
    ipAddress: actionData.ipAddress || '0.0.0.0',
    userAgent: actionData.userAgent || 'Unknown'
  });
};

// Static method to get user audit logs
auditLogSchema.statics.getUserLogs = function(userId, limit = 100) {
  return this.find({ performedBy: userId })
    .populate('targetUserId', 'fullName mail')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get entity logs
auditLogSchema.statics.getEntityLogs = function(entityType, entityId) {
  return this.find({ entityType, entityId })
    .populate('performedBy', 'fullName mail')
    .sort({ createdAt: -1 });
};

// Static method to get critical logs
auditLogSchema.statics.getCriticalLogs = function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    severity: { $in: ['high', 'critical'] },
    createdAt: { $gte: cutoffDate }
  })
  .populate('performedBy', 'fullName mail')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
