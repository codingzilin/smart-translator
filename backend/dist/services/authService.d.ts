interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}
interface LoginRequest {
    email: string;
    password: string;
}
interface AuthResponse {
    user: {
        id: string;
        email: string;
        username: string;
        createdAt: Date;
        preferences: {
            defaultTone: string;
            language: string;
        };
    };
    token: string;
}
interface UserProfile {
    id: string;
    email: string;
    username: string;
    createdAt: Date;
    lastLoginAt: Date | null;
    preferences: {
        defaultTone: string;
        language: string;
    };
}
export declare class AuthService {
    private readonly saltRounds;
    private readonly jwtSecret;
    private readonly jwtExpiresIn;
    constructor();
    register(registerData: RegisterRequest): Promise<AuthResponse>;
    login(loginData: LoginRequest): Promise<AuthResponse>;
    getUserById(userId: string): Promise<UserProfile | null>;
    getUserByEmail(email: string): Promise<UserProfile | null>;
    updateProfile(userId: string, updates: {
        username?: string;
        email?: string;
    }): Promise<UserProfile>;
    updatePreferences(userId: string, preferences: {
        defaultTone?: string;
        language?: string;
    }): Promise<UserProfile>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    private generateToken;
    private mapUserToProfile;
}
export {};
//# sourceMappingURL=authService.d.ts.map