// models/TrendingSearch.js
import mongoose from "mongoose";

const TrendingSearchSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true } // keeps track of createdAt & updatedAt
);

export default mongoose.models.TrendingSearch ||
  mongoose.model("TrendingSearch", TrendingSearchSchema);
