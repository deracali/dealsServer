import mongoose from "mongoose";

const CuratedCategorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    dealsCount: { type: Number, required: true },
    maxDiscount: { type: Number, required: true },
    color: { type: String, required: true },
  },
  {
    timestamps: true, // optional: adds createdAt and updatedAt
  }
);

const CuratedCategory = mongoose.model("CuratedCategory", CuratedCategorySchema);

export default CuratedCategory;
