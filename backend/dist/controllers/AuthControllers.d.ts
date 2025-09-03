import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: any;
}
interface RegisterBody {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}
interface LoginBody {
    email: string;
    password: string;
}
export declare class AuthController {
    static register(req: Request<{}, {}, RegisterBody>, res: Response): Promise<Response<any, Record<string, any>>>;
    static login(req: Request<{}, {}, LoginBody>, res: Response): Promise<Response<any, Record<string, any>>>;
    static me(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static changePassword(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static refreshToken(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
export {};
//# sourceMappingURL=AuthControllers.d.ts.map