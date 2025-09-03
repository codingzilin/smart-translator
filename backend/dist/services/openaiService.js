"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
// src/services/openaiService.ts
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
class OpenAIService {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.tonePrompts = {
            natural: "Translate the following text to English naturally and accurately:",
            gentle: "Translate the following text to English with a gentle, soft tone:",
            cute: "Translate the following text to English with a cute, playful tone:",
            depressed: "Translate the following text to English with a melancholic, sad tone:",
            angry: "Translate the following text to English with an angry, intense tone:",
        };
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not defined in environment variables");
        }
        this.openai = new openai_1.default({
            apiKey: apiKey,
        });
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async detectLanguage(text) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "user",
                        content: `Detect the language of this text and return only the language name in English: "${text}"`,
                    },
                ],
                temperature: 0.1,
                max_tokens: 50,
            });
            return (response.choices[0]?.message?.content?.trim().toLowerCase() || "unknown");
        }
        catch (error) {
            logger_1.logger.warn("Language detection failed:", error);
            return "unknown";
        }
    }
    async translate(text, tone = "natural") {
        if (!text || text.trim().length === 0) {
            throw new Error("Text to translate cannot be empty");
        }
        if (text.length > 5000) {
            throw new Error("Text is too long. Maximum length is 5000 characters.");
        }
        const selectedPrompt = this.tonePrompts[tone] || this.tonePrompts.natural;
        const prompt = `${selectedPrompt}

Text: ${text}

Requirements:
- Keep the meaning accurate
- Adapt the tone appropriately
- Make it sound natural in English
- Preserve any formatting or special characters
- Return only the translation without explanations`;
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger_1.logger.info(`Translation attempt ${attempt}/${this.maxRetries}`, {
                    textLength: text.length,
                    tone,
                    attempt,
                });
                const response = await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1000,
                    presence_penalty: 0,
                    frequency_penalty: 0.1,
                });
                const translatedText = response.choices[0]?.message?.content?.trim();
                if (!translatedText) {
                    throw new Error("No translation received from OpenAI");
                }
                logger_1.logger.info("Translation successful", {
                    originalLength: text.length,
                    translatedLength: translatedText.length,
                    tone,
                    tokensUsed: response.usage?.total_tokens || 0,
                });
                return translatedText;
            }
            catch (error) {
                lastError = error;
                logger_1.logger.error(`Translation attempt ${attempt} failed:`, {
                    error: lastError.message,
                    textLength: text.length,
                    tone,
                    attempt,
                });
                // Handle specific OpenAI errors
                if (error instanceof Error) {
                    if (error.message.includes("rate_limit_exceeded")) {
                        const delayTime = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                        logger_1.logger.warn(`Rate limit exceeded, waiting ${delayTime}ms before retry`);
                        await this.delay(delayTime);
                        continue;
                    }
                    if (error.message.includes("insufficient_quota")) {
                        throw new Error("OpenAI API quota exceeded. Please try again later.");
                    }
                    if (error.message.includes("invalid_api_key")) {
                        throw new Error("Invalid OpenAI API key configuration.");
                    }
                    if (error.message.includes("model_not_found")) {
                        throw new Error("Translation model is currently unavailable.");
                    }
                }
                // If it's the last attempt, throw the error
                if (attempt === this.maxRetries) {
                    throw new Error(`Translation failed after ${this.maxRetries} attempts: ${lastError.message}`);
                }
                // Wait before retrying
                await this.delay(this.retryDelay * attempt);
            }
        }
        throw lastError;
    }
    async translateWithDetails(text, tone = "natural") {
        try {
            // Detect original language
            const detectedLanguage = await this.detectLanguage(text);
            // Perform translation
            const translatedText = await this.translate(text, tone);
            // Calculate confidence based on text characteristics
            const confidence = this.calculateConfidence(text, translatedText);
            return {
                translatedText,
                detectedLanguage,
                confidence,
            };
        }
        catch (error) {
            logger_1.logger.error("Detailed translation failed:", error);
            throw error;
        }
    }
    calculateConfidence(originalText, translatedText) {
        // Simple confidence calculation based on length ratio and content
        const lengthRatio = translatedText.length / originalText.length;
        let confidence = 0.8; // Base confidence
        // Adjust based on length ratio (reasonable translations should be similar length)
        if (lengthRatio > 0.5 && lengthRatio < 2.0) {
            confidence += 0.1;
        }
        else {
            confidence -= 0.2;
        }
        // Check if translation contains the original text (might indicate no translation occurred)
        if (translatedText.toLowerCase().includes(originalText.toLowerCase())) {
            confidence -= 0.3;
        }
        // Ensure confidence is between 0 and 1
        return Math.max(0, Math.min(1, confidence));
    }
    async validateApiKey() {
        try {
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 5,
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error("OpenAI API key validation failed:", error);
            return false;
        }
    }
    async getAvailableModels() {
        try {
            const models = await this.openai.models.list();
            return models.data
                .filter((model) => model.id.includes("gpt"))
                .map((model) => model.id)
                .sort();
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch available models:", error);
            return ["gpt-3.5-turbo"]; // Return default model
        }
    }
    async estimateTokens(text) {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
    async estimateCost(text, model = "gpt-3.5-turbo") {
        const tokens = await this.estimateTokens(text);
        // Pricing as of 2024 (these should be updated regularly)
        const pricing = {
            "gpt-3.5-turbo": 0.0015, // per 1k tokens
            "gpt-4": 0.03, // per 1k tokens
        };
        const costPer1k = pricing[model] || pricing["gpt-3.5-turbo"];
        return (tokens / 1000) * costPer1k;
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openaiService.js.map