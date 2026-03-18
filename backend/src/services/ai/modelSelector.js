/**
 * Model Selector for AI Service
 * Dynamic model selection based on task complexity
 * 
 * Supported Models:
 * - LLaMA3 (llama3-70b-8192) - Complex reasoning, detailed analysis
 * - Mixtral (mixtral-8x7b-32768) - Fast inference, short tasks
 * - LLaMA3-8B (llama3-8b-8192) - Lightweight tasks
 */

const GROQ = require('groq');

// Model configurations
const MODELS = {
    // High-performance models for complex tasks
    llama3_70b: {
        id: 'llama3-70b-8192',
        name: 'LLaMA3 70B',
        contextLength: 8192,
        description: 'Best for complex reasoning and detailed analysis',
        recommendedFor: ['complex-analysis', 'detailed-writing', 'reasoning']
    },
    
    // Fast inference model for quick tasks
    mixtral: {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        description: 'Fast inference, ideal for short tasks',
        recommendedFor: ['quick-response', 'simple-analysis', 'short-tasks']
    },
    
    // Lightweight model for basic tasks
    llama3_8b: {
        id: 'llama3-8b-8192',
        name: 'LLaMA3 8B',
        contextLength: 8192,
        description: 'Lightweight, efficient for basic tasks',
        recommendedFor: ['basic-tasks', 'simple-extraction', 'quick-summaries']
    }
};

// Task type classifications
const TASK_TYPES = {
    // Complex tasks - use LLaMA3 70B
    'jd-generation': { model: 'llama3_70b', maxTokens: 4096, temperature: 0.7 },
    'candidate-screening': { model: 'llama3_70b', maxTokens: 2048, temperature: 0.5 },
    'complex-analysis': { model: 'llama3_70b', maxTokens: 4096, temperature: 0.6 },
    'detailed-writing': { model: 'llama3_70b', maxTokens: 4096, temperature: 0.7 },
    'reasoning': { model: 'llama3_70b', maxTokens: 4096, temperature: 0.5 },
    
    // Medium tasks - use Mixtral
    'social-share': { model: 'mixtral', maxTokens: 1024, temperature: 0.7 },
    'chat': { model: 'mixtral', maxTokens: 2048, temperature: 0.7 },
    'summary': { model: 'mixtral', maxTokens: 1024, temperature: 0.5 },
    
    // Simple tasks - use LLaMA3 8B
    'basic-tasks': { model: 'llama3_8b', maxTokens: 512, temperature: 0.5 },
    'simple-extraction': { model: 'llama3_8b', maxTokens: 512, temperature: 0.3 },
    'quick-summaries': { model: 'llama3_8b', maxTokens: 512, temperature: 0.5 }
};

/**
 * Get model configuration for a specific task type
 * @param {string} taskType - Type of task (e.g., 'jd-generation', 'candidate-screening')
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Object} Model configuration with id, maxTokens, temperature
 */
function getModelForTask(taskType, customOptions = {}) {
    // Check if custom model is specified
    if (customOptions.model) {
        const customModel = MODELS[customOptions.model];
        if (customModel) {
            return {
                id: customModel.id,
                name: customModel.name,
                maxTokens: customOptions.maxTokens || 2048,
                temperature: customOptions.temperature || 0.7
            };
        }
    }
    
    // Get task configuration
    const taskConfig = TASK_TYPES[taskType] || TASK_TYPES['chat'];
    const modelConfig = MODELS[taskConfig.model];
    
    // Merge with custom options
    return {
        id: modelConfig.id,
        name: modelConfig.name,
        maxTokens: customOptions.maxTokens || taskConfig.maxTokens,
        temperature: customOptions.temperature || taskConfig.temperature
    };
}

/**
 * Select best model based on input length and complexity
 * @param {string} inputText - Input text to analyze
 * @param {Object} options - Options for model selection
 * @returns {Object} Model configuration
 */
function selectOptimalModel(inputText, options = {}) {
    const { 
        preferSpeed = false,
        preferQuality = false,
        maxTokens = 2048 
    } = options;
    
    const inputLength = inputText ? inputText.length : 0;
    
    // Short inputs - prioritize speed
    if (inputLength < 500 || preferSpeed) {
        return {
            id: MODELS.mixtral.id,
            name: MODELS.mixtral.name,
            maxTokens,
            temperature: 0.6
        };
    }
    
    // Long inputs or quality preference - use larger model
    if (inputLength > 3000 || preferQuality) {
        return {
            id: MODELS.llama3_70b.id,
            name: MODELS.llama3_70b.name,
            maxTokens,
            temperature: 0.6
        };
    }
    
    // Medium inputs - use Mixtral
    return {
        id: MODELS.mixtral.id,
        name: MODELS.mixtral.name,
        maxTokens,
        temperature: 0.6
    };
}

/**
 * Get available models list
 * @returns {Array} List of available models
 */
function getAvailableModels() {
    return Object.values(MODELS).map(m => ({
        id: m.id,
        name: m.name,
        contextLength: m.contextLength,
        description: m.description
    }));
}

/**
 * Get model by ID
 * @param {string} modelId - Model identifier
 * @returns {Object|null} Model configuration or null
 */
function getModelById(modelId) {
    for (const [key, model] of Object.entries(MODELS)) {
        if (model.id === modelId || key === modelId) {
            return {
                id: model.id,
                name: model.name,
                contextLength: model.contextLength,
                description: model.description
            };
        }
    }
    return null;
}

/**
 * Validate if model is available
 * @param {string} modelId - Model ID to validate
 * @returns {boolean} True if model is available
 */
function isModelAvailable(modelId) {
    return getModelById(modelId) !== null;
}

/**
 * Get default model (Mixtral for speed)
 * @returns {Object} Default model configuration
 */
function getDefaultModel() {
    return {
        id: MODELS.mixtral.id,
        name: MODELS.mixtral.name,
        contextLength: MODELS.mixtral.contextLength,
        maxTokens: 2048,
        temperature: 0.7
    };
}

/**
 * Get model for JD rewrite task
 * @returns {Object} Model configuration
 */
function getModelForJDRewrite() {
    return getModelForTask('jd-generation');
}

/**
 * Get model for candidate screening
 * @returns {Object} Model configuration
 */
function getModelForCandidateScreen() {
    return getModelForTask('candidate-screening');
}

/**
 * Get model for chat
 * @returns {Object} Model configuration
 */
function getModelForChat() {
    return getModelForTask('chat');
}

module.exports = {
    MODELS,
    TASK_TYPES,
    getModelForTask,
    selectOptimalModel,
    getAvailableModels,
    getModelById,
    isModelAvailable,
    getDefaultModel,
    getModelForJDRewrite,
    getModelForCandidateScreen,
    getModelForChat
};
