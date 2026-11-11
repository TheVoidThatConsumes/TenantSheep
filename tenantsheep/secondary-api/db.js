const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/tenantsheep_distro';
  await mongoose.connect(uri);
  console.log('secondary-api connected to MongoDB');
};
