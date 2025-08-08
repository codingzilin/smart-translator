// src/services/openaiService.ts
import OpenAI from "openai";
import { logger } from "../utils/logger";

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

interface TonePrompts {
  [key: string]: string;
}

export class OpenAIService {
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined in environment variables");
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  private readonly tonePrompts: TonePrompts = {
    natural:
      "Translate the following text to English naturally and accurately:",
    gentle: "Translate the following text to English with a gentle, soft tone:",
    cute: "Translate the following text to English with a cute, playful tone:",
    depressed:
      "Translate the following text to English with a melancholic, sad tone:",
    angry:
      "Translate the following text to English with an angry, intense tone:",
  };

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async detectLanguage(text: string): Promise<string> {
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

      return (
        response.choices[0]?.message?.content?.trim().toLowerCase() || "unknown"
      );
    } catch (error) {
      logger.warn("Language detection failed:", error as Error);
      return "unknown";
    }
  }

  async translate(text: string, tone: string = "natural"): Promise<string> {
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

    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Translation attempt ${attempt}/${this.maxRetries}`, {
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

        logger.info("Translation successful", {
          originalLength: text.length,
          translatedLength: translatedText.length,
          tone,
          tokensUsed: response.usage?.total_tokens || 0,
        });

        return translatedText;
      } catch (error) {
        lastError = error as Error;

        logger.error(`Translation attempt ${attempt} failed:`, {
          error: lastError.message,
          textLength: text.length,
          tone,
          attempt,
        });

        // Handle specific OpenAI errors
        if (error instanceof Error) {
          if (error.message.includes("rate_limit_exceeded")) {
            const delayTime = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            logger.warn(
              `Rate limit exceeded, waiting ${delayTime}ms before retry`
            );
            await this.delay(delayTime);
            continue;
          }

          if (error.message.includes("insufficient_quota")) {
            throw new Error(
              "OpenAI API quota exceeded. Please try again later."
            );
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
          throw new Error(
            `Translation failed after ${this.maxRetries} attempts: ${lastError.message}`
          );
        }

        // Wait before retrying
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw lastError!;
  }

  async translateWithDetails(
    text: string,
    tone: string = "natural"
  ): Promise<TranslationResult> {
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
    } catch (error) {
      logger.error("Detailed translation failed:", error as Error);
      throw error;
    }
  }

  private calculateConfidence(
    originalText: string,
    translatedText: string
  ): number {
    // Simple confidence calculation based on length ratio and content
    const lengthRatio = translatedText.length / originalText.length;
    let confidence = 0.8; // Base confidence

    // Adjust based on length ratio (reasonable translations should be similar length)
    if (lengthRatio > 0.5 && lengthRatio < 2.0) {
      confidence += 0.1;
    } else {
      confidence -= 0.2;
    }

    // Check if translation contains the original text (might indicate no translation occurred)
    if (translatedText.toLowerCase().includes(originalText.toLowerCase())) {
      confidence -= 0.3;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      logger.error("OpenAI API key validation failed:", error as Error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter((model) => model.id.includes("gpt"))
        .map((model) => model.id)
        .sort();
    } catch (error) {
      logger.error("Failed to fetch available models:", error as Error);
      return ["gpt-3.5-turbo"]; // Return default model
    }
  }

  async estimateTokens(text: string): Promise<number> {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  async estimateCost(
    text: string,
    model: string = "gpt-3.5-turbo"
  ): Promise<number> {
    const tokens = await this.estimateTokens(text);

    // Pricing as of 2024 (these should be updated regularly)
    const pricing = {
      "gpt-3.5-turbo": 0.0015, // per 1k tokens
      "gpt-4": 0.03, // per 1k tokens
    };

    const costPer1k =
      pricing[model as keyof typeof pricing] || pricing["gpt-3.5-turbo"];
    return (tokens / 1000) * costPer1k;
  }
}
