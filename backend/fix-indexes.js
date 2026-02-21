// Fix MongoDB indexes for Payment collection
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/atract');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    console.log('Connected to MongoDB');

    // Drop the old problematic index
    try {
      await collection.dropIndex('sessionId_1');
      console.log('✅ Dropped old sessionId index');
    } catch (e) {
      console.log('Old index may not exist:', e.message);
    }

    // Create new partial indexes
    await collection.createIndex(
      { sessionId: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { sessionId: { $exists: true, $ne: null } }
      }
    );
    console.log('✅ Created partial sessionId index');

    await collection.createIndex(
      { orderId: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { orderId: { $exists: true, $ne: null } }
      }
    );
    console.log('✅ Created partial orderId index');

    await collection.createIndex(
      { paymentId: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { paymentId: { $exists: true, $ne: null } }
      }
    );
    console.log('✅ Created partial paymentId index');

    console.log('🎉 All indexes fixed successfully!');
    console.log('You can now test Razorpay payments without duplicate key errors.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();