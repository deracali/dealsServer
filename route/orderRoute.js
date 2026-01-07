import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} from "../controller/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/create", createOrder);          // Create order
orderRouter.get("/get", getOrders);             // Get all orders (?userId=)
orderRouter.get("/getbyid/:id", getOrderById);        // Get single order
orderRouter.put("/update/:id", updateOrder);         // Update order
orderRouter.delete("/delete/:id", deleteOrder);      // Delete order

export default orderRouter;
