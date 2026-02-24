const mongoose = require('mongoose');
const { bootstrapAsync } = require('./src/services/integrationBootstrapService.js');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    console.log('Connected to DB prepmate-ai-studio');

    const User = mongoose.connection.collection('users');
    const user = await User.findOne({ email: 'amar@gmail.com' });
    
    if (!user) {
      console.log('User not found!');
      process.exit(0);
    }
    
    // Clear his submissions
    const ExternalPlatformSubmission = mongoose.connection.collection('externalplatformsubmissions');
    await ExternalPlatformSubmission.deleteMany({ userId: user._id });
    console.log('Cleared existing submissions for Amar.');

    // Remove topic progressions to ensure clean slate
    await mongoose.connection.collection('usertopicprogressions').deleteMany({ userId: user._id });
    console.log('Cleared existing topic progressions.');

    // Call bootstrap
    console.log('Starting bootstrap...');
    // Because bootstrapAsync is async but uses setImmediate in older imports, we'll try the direct bootstrap function
    
    // We can't easily require ES modules from CJS inside backend if backend is type: module!
    // Wait, backend package.json has "type": "module" !
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
