interface TranslationResult {
    translatedText: string;
    detectedLanguage?: string;
    confidence?: number;
}
export declare class OpenAIService {
    private openai;
    private readonly maxRetries;
    private readonly retryDelay;
    constructor();
    private readonly tonePrompts;
    private delay;
    private detectLanguage;
    translate(text: string, tone?: string): Promise<string>;
    translateWithDetails(text: string, tone?: string): Promise<TranslationResult>;
    private calculateConfidence;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): Promise<string[]>;
    estimateTokens(text: string): Promise<number>;
    estimateCost(text: string, model?: string): Promise<number>;
}
export {};
//# sourceMappingURL=openaiService.d.ts.map