// routes/trendingRoutes.js
import express from "express";
import { getTrendingSearches, addOrUpdateTrendingSearch } from "../controller/trendingSearchController.js";

const trendignSearchRoute = express.Router();

// GET top trending
trendignSearchRoute.get("/", getTrendingSearches);

// POST new search / increment count
trendignSearchRoute.post("/", addOrUpdateTrendingSearch);

export default trendignSearchRoute;
