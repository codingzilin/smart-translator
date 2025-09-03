import { Request, Response, NextFunction } from "express";
import { ValidationChain } from "express-validator";
export declare const validateRegistration: ValidationChain[];
export declare const validateLogin: ValidationChain[];
export declare const validateTranslation: ValidationChain[];
export declare const validateUserUpdate: ValidationChain[];
export declare const validatePasswordChange: ValidationChain[];
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateObjectId: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSearchQuery: ValidationChain[];
//# sourceMappingURL=validation.d.ts.map