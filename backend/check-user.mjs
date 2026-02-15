import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
  
  const rawUser = await mongoose.connection.collection('users').findOne({email: 'testlc1771170024708@example.com'});
  
  if (!rawUser) {
    console.log('User not found');
  } else {
    console.log('User found!');
    console.log('Email:', rawUser.email);
    console.log('platformProfiles:', JSON.stringify(rawUser.platformProfiles, null, 2));
    console.log('totalProblemsCount:', rawUser.totalProblemsCount);
  }
  
  await mongoose.disconnect();
  process.exit(0);
})();
