import mongoose, { Document } from "mongoose";
export interface ITranslation extends Document {
    userId: mongoose.Types.ObjectId;
    originalText: string;
    originalLanguage: string;
    translatedText: string;
    tone: string;
    createdAt: Date;
    isFavorite: boolean;
    tags: string[];
}
export declare const Translation: mongoose.Model<ITranslation, {}, {}, {}, mongoose.Document<unknown, {}, ITranslation, {}> & ITranslation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Translation.d.ts.map