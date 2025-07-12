import mongoose, { Document, Schema } from "mongoose";

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

const translationSchema = new Schema<ITranslation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
        validator: function (tags: string[]) {
          return tags.length <= 10; // Maximum 10 tags
        },
        message: "Maximum 10 tags allowed",
      },
    },
  },
  {
    timestamps: true,
  }
);

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
translationSchema.methods.addTag = function (tag: string) {
  if (!this.tags.includes(tag) && this.tags.length < 10) {
    this.tags.push(tag);
    return this.save();
  }
  return this;
};

// Instance method to remove tags
translationSchema.methods.removeTag = function (tag: string) {
  this.tags = this.tags.filter((t) => t !== tag);
  return this.save();
};

// Static method to find translations by user
translationSchema.statics.findByUser = function (
  userId: mongoose.Types.ObjectId
) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find favorite translations
translationSchema.statics.findFavoritesByUser = function (
  userId: mongoose.Types.ObjectId
) {
  return this.find({ userId, isFavorite: true }).sort({ createdAt: -1 });
};

// Static method to search translations
translationSchema.statics.searchByUser = function (
  userId: mongoose.Types.ObjectId,
  query: string
) {
  return this.find({
    userId,
    $or: [
      { originalText: { $regex: query, $options: "i" } },
      { translatedText: { $regex: query, $options: "i" } },
      { tags: { $in: [new RegExp(query, "i")] } },
    ],
  }).sort({ createdAt: -1 });
};

export const Translation = mongoose.model<ITranslation>(
  "Translation",
  translationSchema
);
