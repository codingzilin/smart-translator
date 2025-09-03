import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: any;
}
export declare class UserController {
    static getProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProfile(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updatePreferences(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getActivity(req: AuthRequest, res: Response): Promise<void>;
    static getDashboard(req: AuthRequest, res: Response): Promise<void>;
    static deleteAccount(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static exportData(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    private static getUserStats;
    static resetPreferences(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export {};
//# sourceMappingURL=UserControllers.d.ts.map