/**
 * Config Loader for Environment-Based Configuration
 * Loads configuration based on NODE_ENV
 * 
 * Usage:
 *   const config = require('./config/index.js');
 *   config.env - Current environment
 *   config.apiUrl - API URL for current environment
 *   config.dbUri - Database URI for current environment
 */

const path = require('path');
const fs = require('fs');

// Determine current environment (default to development)
const NODE_ENV = process.env.NODE_ENV || 'development';

// Environment file mapping
const envFiles = {
    development: '.env.development',
    staging: '.env.staging',
    production: '.env.production',
    test: '.env.test'
};

// Get the env file for current environment
const envFile = envFiles[NODE_ENV] || '.env.development';

// Load the base .env file first
require('dotenv').config();

// Try to load environment-specific config
const envFilePath = path.join(__dirname, '..', '..', envFile);
const envFileExists = fs.existsSync(envFilePath);

if (envFileExists) {
    console.log(`Loading environment config: ${envFile}`);
    require('dotenv').config({
        path: envFilePath
    });
} else {
    console.log(`Environment config not found: ${envFile}, using defaults`);
}

/**
 * Get configuration value with fallback
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
function getConfig(key, defaultValue) {
    return process.env[key] || defaultValue;
}

/**
 * Get database URI based on environment
 * @returns {string} Database URI
 */
function getDbUri() {
    // Use environment-specific DB URI if available
    const envDbUri = getConfig(`MONGO_URI_${NODE_ENV.toUpperCase()}`);
    if (envDbUri) {
        return envDbUri;
    }
    
    // Fall back to default MONGO_URI
    return getConfig('MONGO_URI', 'mongodb://localhost:27017/atract');
}

/**
 * Get API URL based on environment
 * @returns {string} API URL
 */
function getApiUrl() {
    const envApiUrl = getConfig(`API_URL_${NODE_ENV.toUpperCase()}`);
    if (envApiUrl) {
        return envApiUrl;
    }
    
    return getConfig('API_URL', getConfig('FRONTEND_URL', 'http://localhost:5001'));
}

/**
 * Get frontend URL based on environment
 * @returns {string} Frontend URL
 */
function getFrontendUrl() {
    const envFrontendUrl = getConfig(`FRONTEND_URL_${NODE_ENV.toUpperCase()}`);
    if (envFrontendUrl) {
        return envFrontendUrl;
    }
    
    return getConfig('FRONTEND_URL', 'http://localhost:3010');
}

/**
 * Get CORS origins based on environment
 * @returns {Array<string>} CORS origins
 */
function getCorsOrigins() {
    const origins = [];
    
    // Add environment-specific CORS origin
    const envCors = getConfig(`CORS_${NODE_ENV.toUpperCase()}`);
    if (envCors) {
        origins.push(envCors);
    }
    
    // Add default CORS origins
    const cors1 = getConfig('CORS_1');
    const cors2 = getConfig('CORS_2');
    const cors3 = getConfig('CORS_3');
    
    if (cors1) origins.push(cors1);
    if (cors2) origins.push(cors2);
    if (cors3) origins.push(cors3);
    
    // Add common localhost ports
    origins.push('http://localhost:3000');
    origins.push('http://localhost:3010');
    
    return [...new Set(origins)]; // Remove duplicates
}

/**
 * Get AI configuration based on environment
 * @returns {Object} AI configuration
 */
function getAIConfig() {
    return {
        provider: getConfig('AI_PROVIDER', 'groq'),
        groq: {
            apiKey: getConfig('GROQ_API_KEY'),
            model: getConfig('GROQ_MODEL', 'mixtral-8x7b-32768')
        },
        gemini: {
            apiKey: getConfig('GEMINI_API_KEY'),
            model: getConfig('GEMINI_MODEL', 'gemini-2.5-flash')
        },
        openai: {
            apiKey: getConfig('OPENAI_API_KEY'),
            model: getConfig('OPENAI_MODEL', 'gpt-4')
        },
        together: {
            apiKey: getConfig('TOGETHER_API_KEY'),
            model: getConfig('TOGETHER_MODEL', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo')
        }
    };
}

/**
 * Get server configuration
 * @returns {Object} Server configuration
 */
function getServerConfig() {
    return {
        port: parseInt(getConfig('PORT', '5001'), 10),
        nodeEnv: NODE_ENV,
        isProduction: NODE_ENV === 'production',
        isStaging: NODE_ENV === 'staging',
        isDevelopment: NODE_ENV === 'development',
        isTest: NODE_ENV === 'test'
    };
}

/**
 * Get all configuration
 * @returns {Object} Full configuration object
 */
function getAllConfig() {
    return {
        env: NODE_ENV,
        server: getServerConfig(),
        db: {
            uri: getDbUri()
        },
        api: {
            url: getApiUrl(),
            frontendUrl: getFrontendUrl()
        },
        cors: {
            origins: getCorsOrigins()
        },
        ai: getAIConfig(),
        jwt: {
            secret: getConfig('JWT_SECRET'),
            expiresIn: getConfig('JWT_EXPIRES_IN', '7d')
        },
        email: {
            host: getConfig('SMTP_HOST', 'smtp.gmail.com'),
            port: parseInt(getConfig('SMTP_PORT', '465'), 10),
            email: getConfig('EMAIL'),
            password: getConfig('EMAIL_PASSWORD')
        },
        payment: {
            razorpay: {
                keyId: getConfig('RAZORPAY_KEY_ID'),
                keySecret: getConfig('RAZORPAY_KEY_SECRET')
            },
            stripe: {
                secretKey: getConfig('STRIPE_SECRET_KEY')
            }
        }
    };
}

// Export configuration functions and values
module.exports = {
    NODE_ENV,
    envFile,
    
    // Configuration getters
    getConfig,
    getDbUri,
    getApiUrl,
    getFrontendUrl,
    getCorsOrigins,
    getAIConfig,
    getServerConfig,
    getAllConfig,
    
    // Convenience exports
    env: NODE_ENV,
    isProduction: NODE_ENV === 'production',
    isStaging: NODE_ENV === 'staging',
    isDevelopment: NODE_ENV === 'development',
    isTest: NODE_ENV === 'test'
};
