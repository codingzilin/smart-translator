import mongoose, { Document, Schema } from "mongoose";

export interface ITranslationHistory extends Document {
  userId: mongoose.Types.ObjectId;
  translationId: mongoose.Types.ObjectId;
  accessedAt: Date;
}

const translationHistorySchema = new Schema<ITranslationHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    translationId: {
      type: Schema.Types.ObjectId,
      ref: "Translation",
      required: true,
    },
    accessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for performance and uniqueness
translationHistorySchema.index(
  { userId: 1, translationId: 1 },
  { unique: true }
);
translationHistorySchema.index({ userId: 1, accessedAt: -1 });

// Static method to record access
translationHistorySchema.statics.recordAccess = async function (
  userId: mongoose.Types.ObjectId,
  translationId: mongoose.Types.ObjectId
) {
  try {
    await this.findOneAndUpdate(
      { userId, translationId },
      { accessedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error recording translation access:", error);
  }
};

// Static method to get user's recent translations
translationHistorySchema.statics.getRecentByUser = function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.find({ userId })
    .sort({ accessedAt: -1 })
    .limit(limit)
    .populate("translationId");
};

// Static method to get most accessed translations
translationHistorySchema.statics.getMostAccessedByUser = function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
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
translationHistorySchema.statics.cleanOldEntries = function (
  daysOld: number = 90
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    accessedAt: { $lt: cutoffDate },
  });
};

// Static method to get access statistics
translationHistorySchema.statics.getAccessStats = function (
  userId: mongoose.Types.ObjectId
) {
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

export const TranslationHistory = mongoose.model<ITranslationHistory>(
  "TranslationHistory",
  translationHistorySchema
);
