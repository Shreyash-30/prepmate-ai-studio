import mongoose from 'mongoose';

/**
 * Interview Session Collection
 * Tracks AI-conducted interview simulations and performance scoring
 * Source: Python AI service app/llm/interview_service.py
 */
const InterviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetCompany: {
      type: String,
      default: 'general',
    },
    interviewType: {
      type: String,
      enum: ['behavioral', 'technical', 'system-design', 'mixed'],
      default: 'technical',
    },
    
    // Problems covered in session
    problems: [
      {
        problemId: String,
        problemTitle: String,
        difficulty: String,
        userSolution: String,
        language: String,
        feedbackReceived: String,
      },
    ],
    
    // Performance scoring
    codingScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    problemSolvingScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Session details
    duration: Number, // seconds
    problemsAttempted: Number,
    problemsSolved: Number,
    successRate: Number, // 0-1
    
    // Feedback
    strengths: [String],
    areasOfImprovement: [String],
    aiInterviewerFeedback: String,
    confidenceLevel: String,
    
    // Session status
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'abandoned'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, targetCompany: 1 });
InterviewSessionSchema.index({ userId: 1, status: 1 });

export default mongoose.model('InterviewSession', InterviewSessionSchema);
