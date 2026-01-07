import express from "express";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
} from "../controller/couponController.js";

const couponRoutes = express.Router();

couponRoutes.post("/create", createCoupon);
couponRoutes.get("/get", getCoupons);
couponRoutes.get("/:id", getCouponById);
couponRoutes.put("/update/:id", updateCoupon);
couponRoutes.delete("/delete/:id", deleteCoupon);

export default couponRoutes;
