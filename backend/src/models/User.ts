import mongoose, { Document, Schema } from "mongoose";

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

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    preferences: {
      defaultTone: {
        type: String,
        enum: ["natural", "gentle", "cute", "depressed", "angry"],
        default: "natural",
      },
      language: {
        type: String,
        default: "en",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual for user's full profile
userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
});

// Transform toJSON to exclude sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export const User = mongoose.model<IUser>("User", userSchema);
