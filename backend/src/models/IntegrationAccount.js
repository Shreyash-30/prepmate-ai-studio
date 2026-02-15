import mongoose from 'mongoose';

const IntegrationAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces'],
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    connectionStatus: {
      type: String,
      enum: ['pending', 'connected', 'failed'],
      default: 'pending',
    },
    bootstrapStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    connectedAt: {
      type: Date,
    },
    lastSyncAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on (userId, platform)
IntegrationAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

export default mongoose.model('IntegrationAccount', IntegrationAccountSchema);
