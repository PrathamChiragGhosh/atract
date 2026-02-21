const axios = require('axios');

/**
 * Murf AI Speech Service
 * Streams/synthesizes speech from text using Murf's API.
 *
 * If onChunk is provided, streams audio chunks (Buffer) via callback and resolves when complete.
 * Otherwise, returns full base64 audio.
 */
async function streamSpeech(text, options = {}, onChunk = null) {
    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
        throw new Error('MURF_API_KEY is required for Murf provider');
    }

    const {
        voiceId = 'en-US-matthew',
        model = 'FALCON',
        format = (process.env.MURF_AUDIO_FORMAT || 'LINEAR16').toUpperCase(), // prefer PCM; fallback handled by caller
        sampleRate = 24000,
        channelType = 'MONO',
        multiNativeLocale = 'en-US'
    } = options;

    const url = 'https://global.api.murf.ai/v1/speech/stream';
    const payload = {
        voiceId,
        text,
        multiNativeLocale,
        model,
        format,
        sampleRate,
        channelType
    };

    const config = {
        method: 'post',
        url,
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
        },
        data: payload,
        responseType: onChunk ? 'stream' : 'arraybuffer'
    };

    let response;
    try {
        response = await axios(config);
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        const msg = data?.errorMessage || data?.message || err.message || 'Murf request failed';
        const error = new Error(`Murf error (${status || 'unknown'}): ${msg}`);
        error.status = status;
        error.data = data;
        throw error;
    }

    if (onChunk) {
        let seq = 0;
        await new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                try {
                    onChunk(chunk, seq++);
                } catch (err) {
                    reject(err);
                }
            });
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });
        return {
            audioBase64: null,
            format: format.toLowerCase(),
            sampleRate
        };
    }

    const audioBuffer = Buffer.from(response.data);
    const audioBase64 = audioBuffer.toString('base64');

    return {
        audioBase64,
        format: format.toLowerCase(),
        sampleRate
    };
}

module.exports = {
    streamSpeech,
    streamSpeechStream
};

/**
 * Return raw streaming response (axios) for advanced pipelines (e.g., server-side transcode).
 */
async function streamSpeechStream(text, options = {}) {
    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) {
        throw new Error('MURF_API_KEY is required for Murf provider');
    }

    const {
        voiceId = 'en-US-matthew',
        model = 'FALCON',
        format = (process.env.MURF_AUDIO_FORMAT || 'LINEAR16').toUpperCase(),
        sampleRate = 24000,
        channelType = 'MONO',
        multiNativeLocale = 'en-US'
    } = options;

    const url = 'https://global.api.murf.ai/v1/speech/stream';
    const payload = {
        voiceId,
        text,
        multiNativeLocale,
        model,
        format,
        sampleRate,
        channelType
    };

    const config = {
        method: 'post',
        url,
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
        },
        data: payload,
        responseType: 'stream'
    };

    let response;
    try {
        response = await axios(config);
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        const msg = data?.errorMessage || data?.message || err.message || 'Murf request failed';
        const error = new Error(`Murf error (${status || 'unknown'}): ${msg}`);
        error.status = status;
        error.data = data;
        throw error;
    }

    return response.data; // Node.js readable stream
}

