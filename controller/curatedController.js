import CuratedCategory from "../model/curatedCollectionSchema.js";

// Create a new category
export const createCategory = async (req, res) => {
  try {
    const category = new CuratedCategory(req.body);
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await CuratedCategory.find().sort({ id: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single category by id
export const getCategoryById = async (req, res) => {
  try {
    const category = await CuratedCategory.findOne({ id: req.params.id });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category by id
export const updateCategory = async (req, res) => {
  try {
    const updated = await CuratedCategory.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category by id
export const deleteCategory = async (req, res) => {
  try {
    const deleted = await CuratedCategory.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
