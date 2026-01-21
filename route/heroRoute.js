import express from "express";
import {
  createHero,
  getHeroes,
  getHeroById,
  updateHero,
  deleteHero,
} from "../controller/heroController.js";

const heroRoutes = express.Router();

heroRoutes.post("/create", createHero);        // Create new hero
heroRoutes.get("/get", getHeroes);          // Get all heroes
heroRoutes.get("/get/:id", getHeroById);     // Get hero by ID
heroRoutes.put("/update/:id", updateHero);      // Update hero
heroRoutes.delete("/delete/:id", deleteHero);   // Delete hero

export default heroRoutes;
