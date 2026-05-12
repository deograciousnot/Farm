import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["farmer", "buyer", "hobbyist"],
      default: "buyer",
    },
    location: {
      type: String,
      default: "Unknown",
      trim: true,
    },
    interests: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "top-rated"],
      default: "unverified",
    },
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    accountStatus: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
