import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controller/curatedController.js";

const curatedCollectionRoute = express.Router();

// CRUD routes
curatedCollectionRoute.post("/create", createCategory);             // Create
curatedCollectionRoute.get("/get", getCategories);              // Read all
curatedCollectionRoute.get("/get/:id", getCategoryById);         // Read one
curatedCollectionRoute.put("/update/:id", updateCategory);          // Update
curatedCollectionRoute.delete("/delete/:id", deleteCategory);       // Delete

export default curatedCollectionRoute;
