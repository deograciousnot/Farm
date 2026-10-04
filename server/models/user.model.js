import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { countyPlugin } from "../utils/regions.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Phone sign-up accounts may have no email or password; they sign in with an SMS code.
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      required() {
        return !this.verifiedPhone;
      },
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      required() {
        return !this.verifiedPhone;
      },
    },
    // False until a new email sign-up enters the code we emailed. Accounts from before email
    // confirmation existed have no value and are treated as confirmed.
    emailVerified: {
      type: Boolean,
    },
    // A phone number proven by SMS code, in +254 format. Used to sign in.
    verifiedPhone: {
      type: String,
      unique: true,
      sparse: true,
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
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    suspendedReason: {
      type: String,
      default: "",
      trim: true,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    // Grants access to the admin dashboard. Set with `npm run server:make-admin -- <email>`.
    isAdmin: {
      type: Boolean,
      default: false,
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
  // Phone-only accounts have no password to compare against.
  return this.password ? bcrypt.compare(candidatePassword, this.password) : Promise.resolve(false);
};

userSchema.plugin(countyPlugin);

export const User = mongoose.model("User", userSchema);
