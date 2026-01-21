import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ===========================
   Author Sub-Schema
=========================== */
const AuthorSchema = new Schema(
  {
    userId: { type: String }, // optional reference to user
    name: { type: String, required: true },
    image: { type: String, default: "" }, // profile image
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
    // Likes / Dislikes for each comment
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    hasUserLiked: [{ type: String }],    // array of userIds who liked
    hasUserDisliked: [{ type: String }], // array of userIds who disliked
  },
  { _id: true }
);

/* ===========================
   Forum Post Schema
=========================== */
const ForumPostSchema = new Schema(
  {
    title: { type: String, required: true, minlength: 5 },
    content: { type: String, required: true, minlength: 20 },

    type: {
      type: String,
      enum: ["question", "scam-report", "general", "deal-discussion"],
      required: true,
    },

    author: { type: AuthorSchema, required: true },

    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },

    hasUserLiked: [{ type: String }],
    hasUserDisliked: [{ type: String }],

    comments: [CommentSchema], // ✅ now each comment has likes/dislikes

    views: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },

    tags: [{ type: String }],

    reportedScamUrl: { type: String },
    relatedDealId: { type: Schema.Types.ObjectId, ref: "Deal" },

    reportReason: { type: String, default: "" },
    isReported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ForumPost = model("ForumPost", ForumPostSchema);

export default ForumPost;
