import express from "express";
import {
  createGroupDeal,
  getAllGroupDeals,
  getGroupDealById,
  getActiveGroupDeals,
  getGroupDealsByVendor,
  reserveSlot,
  confirmSlotPayment,
  deleteGroupDeal,
} from "../controller/groupdealController.js";
import fileUpload from "express-fileupload";


const groupDealsRoute = express.Router();

groupDealsRoute.use(
  fileUpload({
     useTempFiles: false,
     limits: { fileSize: 100 * 1024 * 1024 },
     abortOnLimit: true,
   })
);


groupDealsRoute.post("/create",  createGroupDeal);
groupDealsRoute.get("/get", getAllGroupDeals);
groupDealsRoute.get("/active", getActiveGroupDeals);
groupDealsRoute.get("/vendor/:vendorId", getGroupDealsByVendor);
groupDealsRoute.get("/getbyid/:id", getGroupDealById);
groupDealsRoute.post("/:dealId/:userId/slots/reserve",  reserveSlot);
groupDealsRoute.post("/:dealId/:userId/slots/confirm",  confirmSlotPayment);
groupDealsRoute.delete("/delete/:id",  deleteGroupDeal);

export default groupDealsRoute;
