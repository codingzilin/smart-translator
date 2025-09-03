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
exports.Translation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const translationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    originalText: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    originalLanguage: {
        type: String,
        required: true,
        default: "auto",
    },
    translatedText: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    tone: {
        type: String,
        required: true,
        enum: ["natural", "gentle", "cute", "depressed", "angry"],
        default: "natural",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    isFavorite: {
        type: Boolean,
        default: false,
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (tags) {
                return tags.length <= 10; // Maximum 10 tags
            },
            message: "Maximum 10 tags allowed",
        },
    },
}, {
    timestamps: true,
});
// Indexes for performance
translationSchema.index({ userId: 1, createdAt: -1 });
translationSchema.index({ userId: 1, isFavorite: 1 });
translationSchema.index({ userId: 1, tags: 1 });
translationSchema.index({ originalText: "text", translatedText: "text" });
// Virtual for character counts
translationSchema.virtual("originalTextLength").get(function () {
    return this.originalText.length;
});
translationSchema.virtual("translatedTextLength").get(function () {
    return this.translatedText.length;
});
// Instance method to toggle favorite status
translationSchema.methods.toggleFavorite = function () {
    this.isFavorite = !this.isFavorite;
    return this.save();
};
// Instance method to add tags
translationSchema.methods.addTag = function (tag) {
    if (!this.tags.includes(tag) && this.tags.length < 10) {
        this.tags.push(tag);
        return this.save();
    }
    return this;
};
// Instance method to remove tags
translationSchema.methods.removeTag = function (tag) {
    this.tags = this.tags.filter((t) => t !== tag);
    return this.save();
};
// Static method to find translations by user
translationSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ createdAt: -1 });
};
// Static method to find favorite translations
translationSchema.statics.findFavoritesByUser = function (userId) {
    return this.find({ userId, isFavorite: true }).sort({ createdAt: -1 });
};
// Static method to search translations
translationSchema.statics.searchByUser = function (userId, query) {
    return this.find({
        userId,
        $or: [
            { originalText: { $regex: query, $options: "i" } },
            { translatedText: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
        ],
    }).sort({ createdAt: -1 });
};
exports.Translation = mongoose_1.default.model("Translation", translationSchema);
//# sourceMappingURL=Translation.js.map