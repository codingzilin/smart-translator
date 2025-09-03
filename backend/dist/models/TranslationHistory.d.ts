import mongoose, { Document } from "mongoose";
export interface ITranslationHistory extends Document {
    userId: mongoose.Types.ObjectId;
    translationId: mongoose.Types.ObjectId;
    accessedAt: Date;
}
export declare const TranslationHistory: mongoose.Model<ITranslationHistory, {}, {}, {}, mongoose.Document<unknown, {}, ITranslationHistory, {}> & ITranslationHistory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TranslationHistory.d.ts.map