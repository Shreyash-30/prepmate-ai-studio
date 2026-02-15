import mongoose from 'mongoose';

const ExternalPlatformSubmissionSchema = new mongoose.Schema(
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
    platformSubmissionId: {
      type: String,
      required: true,
    },
    problemId: {
      type: String,
      required: true,
    },
    problemTitle: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Unknown'],
      default: 'Unknown',
    },
    tags: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      required: true,
    },
    language: {
      type: String,
    },
    runtime: {
      type: String,
    },
    memory: {
      type: String,
    },
    submissionTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for user-platform queries
ExternalPlatformSubmissionSchema.index({ userId: 1, platform: 1 });

// Index for platformSubmissionId to ensure uniqueness per user-platform
ExternalPlatformSubmissionSchema.index(
  { userId: 1, platform: 1, platformSubmissionId: 1 },
  { unique: true }
);

export default mongoose.model('ExternalPlatformSubmission', ExternalPlatformSubmissionSchema);
