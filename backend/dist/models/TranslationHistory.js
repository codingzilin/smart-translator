"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const translationHistorySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    translationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Translation",
        required: true,
    },
    accessedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Compound index for performance and uniqueness
translationHistorySchema.index({ userId: 1, translationId: 1 }, { unique: true });
translationHistorySchema.index({ userId: 1, accessedAt: -1 });
// Static method to record access
translationHistorySchema.statics.recordAccess = async function (userId, translationId) {
    try {
        await this.findOneAndUpdate({ userId, translationId }, { accessedAt: new Date() }, { upsert: true, new: true });
    }
    catch (error) {
        console.error("Error recording translation access:", error);
    }
};
// Static method to get user's recent translations
translationHistorySchema.statics.getRecentByUser = function (userId, limit = 10) {
    return this.find({ userId })
        .sort({ accessedAt: -1 })
        .limit(limit)
        .populate("translationId");
};
// Static method to get most accessed translations
translationHistorySchema.statics.getMostAccessedByUser = function (userId, limit = 10) {
    return this.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: "$translationId",
                accessCount: { $sum: 1 },
                lastAccessed: { $max: "$accessedAt" },
            },
        },
        { $sort: { accessCount: -1, lastAccessed: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "translations",
                localField: "_id",
                foreignField: "_id",
                as: "translation",
            },
        },
        { $unwind: "$translation" },
        {
            $project: {
                _id: 0,
                translationId: "$_id",
                accessCount: 1,
                lastAccessed: 1,
                translation: 1,
            },
        },
    ]);
};
// Static method to clean old history entries
translationHistorySchema.statics.cleanOldEntries = function (daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    return this.deleteMany({
        accessedAt: { $lt: cutoffDate },
    });
};
// Static method to get access statistics
translationHistorySchema.statics.getAccessStats = function (userId) {
    return this.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: null,
                totalAccesses: { $sum: 1 },
                uniqueTranslations: { $addToSet: "$translationId" },
                firstAccess: { $min: "$accessedAt" },
                lastAccess: { $max: "$accessedAt" },
            },
        },
        {
            $project: {
                _id: 0,
                totalAccesses: 1,
                uniqueTranslationsCount: { $size: "$uniqueTranslations" },
                firstAccess: 1,
                lastAccess: 1,
            },
        },
    ]);
};
exports.TranslationHistory = mongoose_1.default.model("TranslationHistory", translationHistorySchema);
//# sourceMappingURL=TranslationHistory.js.map