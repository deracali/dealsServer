import express from "express";
import {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  toggleLike,
  addComment,
  toggleUpvote,
  getComments,
  getDealsByUser,
  getVendorDealCount,
  approveDeal,
  rejectDeal,
  getDealsByBrand,
  likeDealComment,
  dislikeDealComment,
  rateDeal
} from "../controller/dealController.js";
// import { protect } from "../middleware/authMiddleware.js";
import fileUpload from "express-fileupload";


const dealsRoute = express.Router();

dealsRoute.use(
  fileUpload({
     useTempFiles: false,
     limits: { fileSize: 100 * 1024 * 1024 },
     abortOnLimit: true,
   })
);


dealsRoute.post("/create", createDeal);
dealsRoute.get("/get", getDeals);
dealsRoute.get("/get-by-id/:id", getDealById);
dealsRoute.put("/update/:id", updateDeal);
dealsRoute.delete("/delete/:id", deleteDeal);
dealsRoute.patch("/:id/approve", approveDeal);
dealsRoute.post("/:id/like", toggleLike);
dealsRoute.post("/:id/comments", addComment);
dealsRoute.post("/:id/upvote", toggleUpvote);
dealsRoute.get("/:id/comments", getComments);
dealsRoute.post("/:id/rate", rateDeal);
dealsRoute.post("/:id/comments/:commentId/like", likeDealComment);
dealsRoute.post("/:id/comments/:commentId/dislike", dislikeDealComment);
dealsRoute.get("/by-user/:userId", getDealsByUser);
dealsRoute.get("/:vendorId/deals/count", getVendorDealCount);
dealsRoute.patch("/:id/reject", rejectDeal);
dealsRoute.get('/brand/:brandName', getDealsByBrand);


export default dealsRoute;
