import { Request, Response, NextFunction } from "express";
interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}
export declare const generalRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const rateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const passwordRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const premiumRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const exportRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const customRateLimit: (options: RateLimitOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const checkPremiumStatus: (req: Request, res: Response, next: NextFunction) => void;
export declare const burstProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const globalRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimit.d.ts.map