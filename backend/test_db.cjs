const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate');
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const user = await User.findOne({ email: 'amar@gmail.com' });
    console.log('User:', user);
    
    if (!user) {
      console.log('User not found!');
      process.exit(0);
    }
    
    const ExternalPlatformSubmission = mongoose.connection.collection('externalplatformsubmissions');
    const subs = await ExternalPlatformSubmission.find({ userId: user._id }).toArray();
    console.log(`Found ${subs.length} submissions`);
    console.log('Submissions (sample):', subs.slice(0, 2).map(s => ({ topic: s.primaryTopicId, status: s.status, title: s.problemTitle })));

    const UserTopicProgression = mongoose.connection.collection('usertopicprogressions');
    const progs = await UserTopicProgression.find({ userId: user._id }).toArray();
    console.log(`Found ${progs.length} progressions`);
    console.log('Progressions (sample):', progs.slice(0, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
