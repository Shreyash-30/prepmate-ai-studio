import mongoose from 'mongoose';

const revisionSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    problemIds: [
      {
        type: String,
        description: 'IDs of the reinforcement and previously solved problems in this session',
      },
    ],
    validationProblemId: {
      type: String,
      description: 'ID of the validation problem shown last',
    },
    revisionAccuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      description: 'Accuracy of the session (e.g., percentage correct without hints)',
    },
    retentionDelta: {
      type: Number,
      default: 0,
      description: 'Change in retention probability after this session',
    },
    sessionDuration: {
      type: Number,
      default: 0,
      description: 'Duration of the session in milliseconds',
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'revision_sessions',
  }
);

revisionSessionSchema.index({ userId: 1, topicId: 1 });
revisionSessionSchema.index({ createdAt: -1 });

export default mongoose.model('RevisionSession', revisionSessionSchema);
