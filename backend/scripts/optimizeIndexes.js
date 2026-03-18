/**
 * Database Index Optimization Script
 * Run this script to create and verify all indexes for optimal performance
 * 
 * Usage:
 *   node scripts/optimizeIndexes.js
 * 
 * Or with specific environment:
 *   NODE_ENV=development node scripts/optimizeIndexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment config
dotenv.config();
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });

// Models to index
const models = [
    { name: 'JobSeeker', model: null },
    { name: 'Employer', model: null },
    { name: 'Job', model: null },
    { name: 'JobApplication', model: null }
];

async function connectDB() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/atract';
    console.log(`Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
}

async function loadModels() {
    models[0].model = require('../src/models/jobSeeker.js');
    models[1].model = require('../src/models/employer.js');
    models[2].model = require('../src/models/job.js');
    models[3].model = require('../src/models/jobApplication.js');
}

async function createIndexes() {
    console.log('\n========== Creating Indexes ==========\n');
    
    for (const { name, model } of models) {
        if (!model) {
            console.log(`⚠️  Skipping ${name} - model not loaded`);
            continue;
        }
        
        try {
            console.log(`📊 Processing ${name}...`);
            
            // Get current indexes
            const indexes = await model.collection.indexes();
            console.log(`   Current indexes: ${indexes.map(i => i.name).join(', ')}`);
            
            // Create indexes (MongoDB will skip existing ones)
            await model.createIndexes();
            
            // Get updated indexes
            const updatedIndexes = await model.collection.indexes();
            console.log(`   ✅ Indexes created/verified: ${updatedIndexes.map(i => i.name).join(', ')}\n`);
            
        } catch (error) {
            console.error(`   ❌ Error creating indexes for ${name}:`, error.message);
        }
    }
}

async function analyzeIndexes() {
    console.log('\n========== Index Analysis ==========\n');
    
    for (const { name, model } of models) {
        if (!model) continue;
        
        try {
            const indexes = await model.collection.indexes();
            console.log(`📊 ${name} indexes:`);
            
            for (const index of indexes) {
                const keyFields = Object.keys(index.key).join(', ');
                const isUnique = index.unique ? ' (UNIQUE)' : '';
                console.log(`   - ${index.name}: ${keyFields}${isUnique}`);
            }
            console.log('');
            
        } catch (error) {
            console.error(`Error analyzing ${name}:`, error.message);
        }
    }
}

async function dropDuplicates() {
    console.log('\n========== Checking for Duplicates ==========\n');
    
    // Check for duplicate emails in JobSeeker
    try {
        const JobSeeker = models[0].model;
        if (JobSeeker) {
            const duplicates = await JobSeeker.aggregate([
                { $group: { _id: '$email', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } }
            ]);
            
            if (duplicates.length > 0) {
                console.log('⚠️  Found duplicate emails in JobSeeker:');
                duplicates.forEach(d => console.log(`   - ${d._id}: ${d.count} occurrences`));
            } else {
                console.log('✅ No duplicate emails in JobSeeker');
            }
        }
    } catch (error) {
        console.error('Error checking duplicates:', error.message);
    }
    
    // Check for duplicate emails in Employer
    try {
        const Employer = models[1].model;
        if (Employer) {
            const duplicates = await Employer.aggregate([
                { $group: { _id: '$email', count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } }
            ]);
            
            if (duplicates.length > 0) {
                console.log('⚠️  Found duplicate emails in Employer:');
                duplicates.forEach(d => console.log(`   - ${d._id}: ${d.count} occurrences`));
            } else {
                console.log('✅ No duplicate emails in Employer');
            }
        }
    } catch (error) {
        console.error('Error checking duplicates:', error.message);
    }
}

async function main() {
    try {
        console.log('🚀 Starting Index Optimization');
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        
        await connectDB();
        await loadModels();
        
        await createIndexes();
        await analyzeIndexes();
        await dropDuplicates();
        
        console.log('\n========== Complete ==========\n');
        console.log('✅ Index optimization complete!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, createIndexes, analyzeIndexes };
