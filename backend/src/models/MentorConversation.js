import mongoose from 'mongoose';

/**
 * Mentor Conversation Collection
 * Stores AI mentor chat histories for tracking learning progress
 * Synced with Python AI service: app/llm/mentor_service.py
 */
const MentorConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    masteryScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete old conversations
MentorConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MentorConversationSchema.index({ userId: 1, createdAt: -1 });
MentorConversationSchema.index({ userId: 1, topic: 1 });

export default mongoose.model('MentorConversation', MentorConversationSchema);
