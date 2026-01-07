import mongoose from "mongoose";

const vendorPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const VendorPlan = mongoose.model("VendorPlan", vendorPlanSchema);

export default VendorPlan;
