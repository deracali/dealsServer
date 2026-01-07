import express from "express";
import {
  createVendorPlan,
  getVendorPlans,
  getVendorPlanById,
  updateVendorPlan,
  deleteVendorPlan,
} from "../controller/vendorPlanController.js";

const vendorPlanRoutes = express.Router();

vendorPlanRoutes.post("/create", createVendorPlan);      // Create
vendorPlanRoutes.get("/get", getVendorPlans);         // Read all
vendorPlanRoutes.get("/get/:id", getVendorPlanById);   // Read one
vendorPlanRoutes.put("/update/:id", updateVendorPlan);    // Update
vendorPlanRoutes.delete("/delete/:id", deleteVendorPlan); // Delete

export default vendorPlanRoutes;
