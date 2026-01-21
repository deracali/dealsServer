import express from "express";
import {
  createVendor,
  getVendors,
  getVendorById,
  getVendorByName,
  updateVendor,
  addVendorComment,
  getVendorComments,
  deleteVendor,
  likeVendorComment,
  dislikeVendorComment
} from "../controller/vendorController.js";
import fileUpload from "express-fileupload";



const vendorRoute = express.Router();
vendorRoute.use(fileUpload({ useTempFiles: true }));
// CRUD
vendorRoute.post("/create", createVendor);
vendorRoute.get("/get", getVendors);
vendorRoute.get("/get/:id", getVendorById);
vendorRoute.get("/name/:name", getVendorByName);
vendorRoute.put("/update/:id", updateVendor);
vendorRoute.post("/:id/comments", addVendorComment);
vendorRoute.get("/:id/comments", getVendorComments);
vendorRoute.post("/:id/comments/:commentId/like", likeVendorComment);
vendorRoute.post("/:id/comments/:commentId/dislike", dislikeVendorComment);
vendorRoute.delete("/delete/:id", deleteVendor);

export default vendorRoute;
