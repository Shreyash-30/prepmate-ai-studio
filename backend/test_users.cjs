const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate');
    console.log('Connected to DB');

    const User = mongoose.connection.collection('users');
    const users = await User.find({}).toArray();
    console.log('Users in DB:');
    users.forEach(u => console.log(u.email, u._id));

    process.exit(0);

  } catch (err) {
    console.error(err);
  }
}

test();
