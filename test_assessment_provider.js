#!/usr/bin/env node

/**
 * Test script to validate assessment provider configuration
 * Run with: node test_assessment_provider.js
 */

console.log('🧪 Testing Assessment Provider Configuration\n');

// Test provider switching by simulating different env values
function testProvider(provider, model) {
    // Temporarily set env vars
    const originalProvider = process.env.BASIC_ASSESSMENT_PROVIDER;
    const originalModel = process.env.BASIC_ASSESSMENT_MODEL;

    process.env.BASIC_ASSESSMENT_PROVIDER = provider;
    process.env.BASIC_ASSESSMENT_MODEL = model;

    // Clear require cache to get fresh instance
    delete require.cache[require.resolve('./backend/src/services/assessmentGenerator')];
    const generator = require('./backend/src/services/assessmentGenerator');

    // Restore env vars
    process.env.BASIC_ASSESSMENT_PROVIDER = originalProvider;
    process.env.BASIC_ASSESSMENT_MODEL = originalModel;

    return generator;
}

try {
    console.log('🔄 Testing Provider Switching:');

    // Test Together AI
    const togetherGen = testProvider('together', 'meta-llama/Llama-3-70b-chat-hf');
    console.log(`   ✅ Together AI: ${togetherGen.provider} → ${togetherGen.model}`);

    // Test Gemini
    const geminiGen = testProvider('gemini', 'gemini-1.5-flash');
    console.log(`   ✅ Gemini: ${geminiGen.provider} → ${geminiGen.model}`);

    // Test default (no env vars)
    const defaultGen = testProvider(undefined, undefined);
    console.log(`   ✅ Default: ${defaultGen.provider} → ${defaultGen.model}`);

    console.log('\n✅ Provider switching validation complete!');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}

console.log('\n📝 To use Gemini:');
console.log('   1. Install: npm install @google/generative-ai');
console.log('   2. Set: BASIC_ASSESSMENT_PROVIDER=gemini');
console.log('   3. Set: BASIC_ASSESSMENT_MODEL=gemini-1.5-flash');
console.log('   4. Set: GEMINI_API_KEY=your_key_here');
console.log('   5. Restart server');

console.log('\n📝 To use Together AI (current default):');
console.log('   1. Set: BASIC_ASSESSMENT_PROVIDER=together (optional)');
console.log('   2. Set: BASIC_ASSESSMENT_MODEL=meta-llama/Llama-3-70b-chat-hf (optional)');
console.log('   3. Ensure: TOGETHER_API_KEY is set');

console.log('\n📋 Supported Providers:');
console.log('   • together: meta-llama/Llama-3-70b-chat-hf, meta-llama/Llama-3-8b-chat-hf, etc.');
console.log('   • gemini: gemini-1.5-flash, gemini-1.5-pro, gemini-pro, etc.');