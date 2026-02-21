// Quick MongoDB index fix script
// Run this with: node fix-mongodb-index.js

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/atract');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    console.log('Checking current indexes...');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the problematic index
    try {
      await collection.dropIndex('sessionId_1');
      console.log('✅ Dropped old sessionId_1 index');
    } catch (e) {
      console.log('Old index may not exist or already dropped:', e.message);
    }

    // Delete documents with null sessionId (optional - uncomment if you want to clean up)
    /*
    const nullSessionCount = await collection.countDocuments({ sessionId: null });
    if (nullSessionCount > 0) {
      console.log(`Found ${nullSessionCount} documents with null sessionId`);
      // Uncomment the next line if you want to delete them:
      // await collection.deleteMany({ sessionId: null });
      // console.log('Deleted documents with null sessionId');
    }
    */

    console.log('✅ Index fix completed!');
    console.log('You can now test Razorpay payments without duplicate key errors.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixIndex();