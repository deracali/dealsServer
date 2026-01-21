import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    backgroundColor: {
      type: String,
      required: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model("Coupon", couponSchema);
