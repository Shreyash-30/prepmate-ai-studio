/**
 * ProblemMetadataCache Model
 * 
 * Stores cached metadata (difficulty and topic tags) for LeetCode problems
 * to avoid repeated API calls to the LeetCode GraphQL endpoint.
 * 
 * Schema Fields:
 * - problemId: String (unique) - Problem slug (e.g., "two-sum")
 * - difficulty: String - Problem difficulty (Easy, Medium, Hard)
 * - tags: [String] - Topic tags (e.g., ["Array", "Hash Table"])
 * - lastFetchedAt: Date - When this metadata was last fetched from LeetCode
 * - timestamps: Auto-managed (createdAt, updatedAt)
 */

import mongoose from 'mongoose';

const problemMetadataCacheSchema = new mongoose.Schema(
  {
    problemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Unknown'],
      default: 'Unknown',
    },
    tags: [
      {
        type: String,
        trim: true,
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

// Efficient query index for fetching multiple problems
problemMetadataCacheSchema.index({ problemId: 1 });

// Index for cache expiration queries (if implementing TTL)
problemMetadataCacheSchema.index({ lastFetchedAt: 1 });

export default mongoose.model('ProblemMetadataCache', problemMetadataCacheSchema);
