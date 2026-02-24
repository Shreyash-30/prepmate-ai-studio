import mongoose from 'mongoose';
import { bootstrap } from './src/services/integrationBootstrapService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio');
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const user = await User.findOne({ email: 'amar@gmail.com' });
    
    if (!user) {
      console.log('User not found!');
      process.exit(0);
    }
    
    const ExternalPlatformSubmission = mongoose.connection.collection('externalplatformsubmissions');
    await ExternalPlatformSubmission.deleteMany({ userId: user._id });
    console.log('Cleared existing submissions for Amar.');

    const UserTopicProgression = mongoose.connection.collection('usertopicprogressions');
    await UserTopicProgression.deleteMany({ userId: user._id });
    console.log('Cleared existing topic progressions.');

    // Now trigger bootstrap directly!
    console.log('Running bootstrap for amar...');
    const result = await bootstrap(user._id, 'leetcode', 'shreyashshinde3011');
    console.log('Bootstrap finished:', result);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
