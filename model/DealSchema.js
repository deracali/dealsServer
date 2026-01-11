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
   Deal Schema
=========================== */
const DealSchema = new Schema(
  {
    // Basic Info
    url: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    images: [{ type: String }],
    category: { type: String },
    tags: [{ type: String }],

    // Pricing
    originalPrice: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    discountPercentage: { type: Number },
    currency: { type: String, default: "USD" },
    currencySymbol: { type: String, default: "$" },
    shippingCost: { type: String, default: "0.00" },
    couponCode: { type: String },
    affiliateUrl: { type: String },

    // Vendor Info
    brand: { type: String },
    platform: { type: String },

    // Specifications
    colors: [{ type: String }],
    sizes: [{ type: String }],
    specifications: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    // Availability & Expiry
    availability: {
      type: String,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock",
    },
    expirationDate: { type: String },
    expiresAt: { type: Date },

    ratings: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        value: { type: Number, min: 1, max: 5, required: true },
      },
    ],

    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    ratingsCount: { type: Number, default: 0 },

    // User Interactions
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "User" }],
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false },
    isSaved: { type: Boolean, default: false },
    freeShipping: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    /* ===========================
       Comments (Forum-style)
    =========================== */
    comments: [CommentSchema],

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Auto-generate slug
DealSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

export default model("Deal", DealSchema);
