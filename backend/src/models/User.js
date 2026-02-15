import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password by default
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    targetCompanies: {
      type: String,
      default: '',
    },
    preparationTimeline: {
      type: String,
      default: '',
    },
    platformProfiles: {
      leetcode: {
        connected: { type: Boolean, default: false },
        username: { type: String, default: null },
        totalSolved: { type: Number, default: 0 },
        acceptanceRate: { type: Number, default: 0 },
        ranking: { type: Number, default: 0 },
        badges: [{ type: String }],
        lastSyncedAt: { type: Date, default: null },
      },
      codeforces: {
        connected: { type: Boolean, default: false },
        username: { type: String, default: null },
        totalSolved: { type: Number, default: 0 },
        contestRating: { type: Number, default: 0 },
        ranking: { type: Number, default: 0 },
        badges: [{ type: String }],
        lastSyncedAt: { type: Date, default: null },
      },
    },
    totalProblemsCount: {
      type: Number,
      default: 0,
    },

    // ============================================
    // ML INTELLIGENCE CONTEXT (NEW)
    // ============================================
    
    // Learning proficiency level for ML model calibration
    learningLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },

    // Target companies for interview readiness prediction
    targetCompaniesArray: [
      {
        type: String,
      },
    ],

    // When user started interview preparation (for readiness timeline)
    preparationStartDate: {
      type: Date,
      default: null,
    },

    // Current phase of preparation
    preparationPhase: {
      type: String,
      enum: ['exploration', 'practice', 'refinement', 'interview-ready'],
      default: 'exploration',
    },

    // Daily study target in minutes (for adaptive planning)
    dailyStudyMinutes: {
      type: Number,
      default: 120,
    },

    // Weight preference: 0=balanced, 1=mastery-focused, 2=breadth-focused
    learningPreference: {
      type: Number,
      default: 0,
    },

    // Opt-out settings for ML services
    mlSettings: {
      enableMasteryTracking: { type: Boolean, default: true },
      enableRetentionScheduling: { type: Boolean, default: true },
      enableWeaknessAnalysis: { type: Boolean, default: true },
      enableAdaptivePlanning: { type: Boolean, default: true },
      enableLLMServices: { type: Boolean, default: true },
    },

    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for email lookup
userSchema.index({ email: 1 });

// Hash password before saving (if password is modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password with hashed password
userSchema.methods.comparePassword = async function (plainPassword) {
  try {
    return await bcryptjs.compare(plainPassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

export default mongoose.model('User', userSchema);
