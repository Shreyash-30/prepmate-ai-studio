import mongoose from 'mongoose';

const IntegrationSyncLogSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      required: true,
    },
    recordsFetched: {
      type: Number,
      default: 0,
    },
    recordsInserted: {
      type: Number,
      default: 0,
    },
    recordsDuplicated: {
      type: Number,
      default: 0,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    durationMs: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user-platform sync log queries
IntegrationSyncLogSchema.index({ userId: 1, platform: 1, createdAt: -1 });

export default mongoose.model('IntegrationSyncLog', IntegrationSyncLogSchema);
