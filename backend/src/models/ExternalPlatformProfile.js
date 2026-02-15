import mongoose from 'mongoose';

const ExternalPlatformProfileSchema = new mongoose.Schema(
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
    totalSolved: {
      type: Number,
      default: 0,
    },
    acceptanceRate: {
      type: Number,
      default: 0,
    },
    contestRating: {
      type: Number,
    },
    ranking: {
      type: Number,
    },
    badges: [
      {
        type: String,
      },
    ],
    lastFetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index on (userId, platform) for quick lookups
ExternalPlatformProfileSchema.index({ userId: 1, platform: 1 });

export default mongoose.model('ExternalPlatformProfile', ExternalPlatformProfileSchema);
