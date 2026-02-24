const mongoose = require('mongoose');

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
    
    const ExternalPlatformSubmission = mongoose.connection.collection('externalplatformsubmissions');
    const subs = await ExternalPlatformSubmission.find({ userId: user._id }).toArray();
    console.log(`Found ${subs.length} submissions`);
    console.log('Submissions (sample):', subs[0]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
