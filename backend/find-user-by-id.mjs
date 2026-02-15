import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
  
  // Search for the specific user ID from the backend logs
  const userID = '6991e9717dc14a22ce47bfde';
  const user = await mongoose.connection.collection('users').findOne({_id: new mongoose.Types.ObjectId(userID)});
  
  console.log(`Searching for user ID: ${userID}`);
  if (user && user._id) {
    console.log('✅ User found!');
    console.log('Email:', user.email);
    console.log('platformProfiles.leetcode:', JSON.stringify(user.platformProfiles?.leetcode, null, 2));
    console.log('totalProblemsCount:', user.totalProblemsCount);
  } else {
    console.log('❌ User not found');
  }
  
  // Count all users
  const count = await mongoose.connection.collection('users').countDocuments();
  console.log(`\nTotal users in database: ${count}`);
  
  // Get all user IDs
  const allUsers = await mongoose.connection.collection('users').find({}).project({_id: 1, email: 1}).toArray();
  console.log('\nAll user IDs:');
  allUsers.forEach(u => {
    console.log(`  ${u._id} - ${u.email}`);
  });
  
  await mongoose.disconnect();
  process.exit(0);
})();
