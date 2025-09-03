import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: any;
}
export declare class TranslationController {
    private static openaiService;
    static translate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getTranslations(req: AuthRequest, res: Response): Promise<void>;
    static getTranslation(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static toggleFavorite(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteTranslation(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteTranslations(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getStatistics(req: AuthRequest, res: Response): Promise<void>;
    private static detectLanguage;
}
export {};
//# sourceMappingURL=TranslationControllers.d.ts.map