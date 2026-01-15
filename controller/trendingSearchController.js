// controllers/trendingController.js
import TrendingSearch from "../model/trendingSearch.js";

// GET top trending searches
export const getTrendingSearches = async (req, res) => {
  try {
    const topSearches = await TrendingSearch.find()
      .sort({ count: -1 })  // highest count first
      .limit(10);            // top 10
    res.status(200).json(topSearches);
  } catch (err) {
    console.error("Error fetching trending searches:", err);
    res.status(500).json({ message: "Failed to fetch trending searches" });
  }
};

// POST / update trending search
export const addOrUpdateTrendingSearch = async (req, res) => {
  const { term } = req.body;
  if (!term || !term.trim()) {
    return res.status(400).json({ message: "Search term is required" });
  }

  try {
    // find if term exists
    const existing = await TrendingSearch.findOne({ term: term.trim() });
    if (existing) {
      existing.count += 1;
      await existing.save();
      return res.status(200).json(existing);
    }

    // create new
    const newSearch = await TrendingSearch.create({ term: term.trim() });
    res.status(201).json(newSearch);
  } catch (err) {
    console.error("Error updating trending search:", err);
    res.status(500).json({ message: "Failed to update trending search" });
  }
};
