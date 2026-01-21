import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ===========================
   Author Sub-Schema
=========================== */
const AuthorSchema = new Schema(
  {
    userId: { type: String }, // optional reference to user
    name: { type: String, required: true },
    image: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    reputation: { type: Number, default: 0 },
  },
  { _id: false }
);

/* ===========================
   Comment Sub-Schema (Flat)
=========================== */
const CommentSchema = new Schema(
  {
    author: {
      type: AuthorSchema,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      default: null, // null = top-level comment
    },
    date: {
      type: Date,
      default: Date.now,
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    hasUserLiked: [{ type: String }],
    hasUserDisliked: [{ type: String }],
  },
  { _id: true }
);

/* ===========================
   Vendor Schema
=========================== */
const VendorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    country: { type: String, trim: true },

    type: {
      type: String,
      enum: ["local", "international"],
      default: "local",
    },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalDeals: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    logo: { type: String, trim: true },
    coverImage: { type: String, trim: true },

    isVerified: { type: Boolean, default: false },

    categories: { type: [String], default: [] },

    joinedDate: { type: Date, default: Date.now },
    responseTime: { type: String, trim: true },

    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ===========================
       Business Details
    =========================== */
    cacNumber: { type: String, trim: true },
    businessWebsite: { type: String, trim: true },
    businessPhone: { type: String, trim: true },
    businessEmail: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    cacDocument: { type: String, trim: true },
    businessLogo: { type: String, trim: true },

    identityImg: { type: String, required: true, trim: true },
    passportPhoto: { type: String, required: true, trim: true },
    identityMatchScore: { type: Number },

    businessBanner: { type: String, trim: true },

    /* ===========================
       Comments (Forum-style)
    =========================== */
    comments: [CommentSchema],
  },
  { timestamps: true }
);

const Vendor = model("Vendor", VendorSchema);

export default Vendor;
