const mongoose = require('mongoose');
require('dotenv').config();

async function dropSessionIdIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atract');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    // Check current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach(idx => {
      console.log(` - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop sessionId_1 index if it exists
    const sessionIdIndex = indexes.find(idx => idx.name === 'sessionId_1');
    if (sessionIdIndex) {
      await collection.dropIndex('sessionId_1');
      console.log('✅ Dropped sessionId_1 index');
    } else {
      console.log('ℹ️ sessionId_1 index not found (already dropped)');
    }

    // Verify remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log('\nRemaining indexes:');
    remainingIndexes.forEach(idx => {
      console.log(` - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

dropSessionIdIndex();