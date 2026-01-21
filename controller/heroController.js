import Hero from "../model/heroSchema.js";

// ✅ Create a new hero
export const createHero = async (req, res) => {
  try {
    const hero = await Hero.create(req.body);
    res.status(201).json({ success: true, data: hero });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Get all heroes
export const getHeroes = async (req, res) => {
  try {
    const heroes = await Hero.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: heroes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get a single hero by ID
export const getHeroById = async (req, res) => {
  try {
    const hero = await Hero.findById(req.params.id);
    if (!hero) return res.status(404).json({ success: false, message: "Hero not found" });
    res.status(200).json({ success: true, data: hero });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update hero by ID
export const updateHero = async (req, res) => {
  try {
    const hero = await Hero.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!hero) return res.status(404).json({ success: false, message: "Hero not found" });
    res.status(200).json({ success: true, data: hero });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Delete hero by ID
export const deleteHero = async (req, res) => {
  try {
    const hero = await Hero.findByIdAndDelete(req.params.id);
    if (!hero) return res.status(404).json({ success: false, message: "Hero not found" });
    res.status(200).json({ success: true, message: "Hero deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
