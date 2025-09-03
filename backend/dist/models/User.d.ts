import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    email: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
    lastLoginAt: Date;
    preferences: {
        defaultTone: string;
        language: string;
    };
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map