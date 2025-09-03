interface TranslationRequest {
    text: string;
    tone: string;
    originalLanguage?: string;
    tags?: string[];
    userId: string;
}
interface TranslationResponse {
    id: string;
    originalText: string;
    translatedText: string;
    tone: string;
    originalLanguage: string;
    createdAt: Date;
    isFavorite: boolean;
    tags: string[];
}
interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
interface SearchOptions extends PaginationOptions {
    query?: string;
    tone?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    isFavorite?: boolean;
}
export declare class TranslationService {
    private openaiService;
    constructor();
    createTranslation(request: TranslationRequest): Promise<TranslationResponse>;
    getTranslationById(id: string, userId: string): Promise<TranslationResponse | null>;
    getUserTranslations(userId: string, options: PaginationOptions): Promise<{
        translations: TranslationResponse[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    searchTranslations(userId: string, searchOptions: SearchOptions): Promise<{
        translations: TranslationResponse[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    toggleFavorite(id: string, userId: string): Promise<TranslationResponse>;
    deleteTranslation(id: string, userId: string): Promise<boolean>;
    addTagsToTranslation(id: string, userId: string, newTags: string[]): Promise<TranslationResponse>;
    getFavoriteTranslations(userId: string, options: PaginationOptions): Promise<{
        translations: TranslationResponse[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }>;
    getUserStats(userId: string): Promise<{
        totalTranslations: number;
        favoriteTranslations: number;
        translationsByTone: {
            [tone: string]: number;
        };
        translationsByLanguage: {
            [language: string]: number;
        };
        recentTranslationsCount: number;
    }>;
    private recordTranslationHistory;
    private mapTranslationToResponse;
}
export {};
//# sourceMappingURL=translationService.d.ts.map