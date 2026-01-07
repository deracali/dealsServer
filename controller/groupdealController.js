// controllers/groupDeal.controller.js
import mongoose from "mongoose";
import GroupDeal from "../model/GroupDeal.js";
import Vendor from "../model/VendorSchema.js";
import User from "../model/userSchema.js";
import streamifier from "streamifier";
import cloudinary from "cloudinary";



// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: upload with timeout
const uploadMediaWithTimeout = async (file) => {
  const start = Date.now();
  const TIMEOUT_MS = 30000;

  const folder = "group_deal_images";

  const streamUpload = () =>
    new Promise((resolve, reject) => {
      try {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [{ width: 1080, quality: "auto" }],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        streamifier.createReadStream(file.data).pipe(uploadStream);
      } catch (err) {
        reject(err);
      }
    });

  const uploadDataUriFallback = async () => {
    const dataUri = `data:${file.mimetype};base64,${file.data.toString("base64")}`;
    return cloudinary.v2.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
      transformation: [{ width: 1080, quality: "auto" }],
    });
  };

  const wrapped = new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Upload timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);

    try {
      const result = await streamUpload();
      clearTimeout(timeout);
      resolve(result);
    } catch (err) {
      clearTimeout(timeout);
      console.warn("streamUpload failed, trying fallback:", err.message || err);
      try {
        const fallbackResult = await uploadDataUriFallback();
        resolve(fallbackResult);
      } catch (fbErr) {
        reject(fbErr);
      }
    }
  });

  const result = await wrapped;
  const duration = Date.now() - start;
  console.log(`✔ Upload finished (${(file.size/1024).toFixed(1)} KB) in ${duration} ms — url: ${result.secure_url || result.url}`);
  return result.secure_url || result.url;
};

// =========================
// CREATE GROUP DEAL
// =========================
export const createGroupDeal = async (req, res) => {
  try {
    const {
      userId, // <-- use this instead of req.user
      vendorId,
      title,
      description,
      originalPrice,
      discountedPrice,
      discountPercentage,
      totalSlots,
      expiresAt,
      shippingType,
      shippingNote,
      deliveryEstimate,
    } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // Handle image uploads
    const files = req.files?.images
      ? Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images]
      : [];

    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadMediaWithTimeout(files[i]);
      imageUrls.push(url);
    }

    // Create group deal
    const groupDeal = await GroupDeal.create({
      title,
      description,
      images: imageUrls,
      originalPrice: Number(originalPrice),
      discountedPrice: Number(discountedPrice),
      discountPercentage: Number(discountPercentage),
      totalSlots: Number(totalSlots),
      expiresAt: new Date(expiresAt),
      shippingType: shippingType || "paid",
      shippingNote: shippingNote || "Delivery fee excluded",
      deliveryEstimate: deliveryEstimate || "2-3 business days",
      vendor: vendor._id,
      vendorName: vendor.name,
      createdBy: user._id, // use the user from userId
    });

    // Update vendor analytics
    vendor.totalDeals += 1;
    await vendor.save();

    res.status(201).json(groupDeal);
  } catch (err) {
    console.error("❌ Error creating group deal:", err);
    res.status(500).json({ message: err.message || String(err) });
  }
};




// controllers/groupDeal.controller.js

/* =========================
   GET ALL GROUP DEALS
========================= */
export const getAllGroupDeals = async (req, res) => {
  try {
    const {
      status,
      vendorId,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Filter by deal status (active, completed, expired)
    if (status) {
      query.status = status;
    }

    // Filter by vendor
    if (vendorId) {
      query.vendor = vendorId;
    }

    const deals = await GroupDeal.find(query)
      .populate("vendor")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await GroupDeal.countDocuments(query);

    res.json({
      deals,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/* =========================
   GET SINGLE GROUP DEAL
========================= */
export const getGroupDealById = async (req, res) => {
  try {
    const deal = await GroupDeal.findById(req.params.id)
      .populate("vendor")
      .populate("slots.user", "name email");

    if (!deal) {
      return res.status(404).json({ message: "Group deal not found" });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





export const reserveSlot = async (req, res) => {
  try {
    const { dealId, userId } = req.params;

    if (!userId || userId === "null") {
      return res.status(400).json({ message: "Valid User ID is required" });
    }

    const deal = await GroupDeal.findById(dealId);
    if (!deal || deal.status !== "active") {
      return res.status(400).json({ message: "Deal not available" });
    }

    const alreadyJoined = deal.slots.some(
      slot => slot.user?.toString() === userId
    );

    if (alreadyJoined) {
      return res.status(400).json({ message: "User already has a slot" });
    }

    const freeSlot = deal.slots.find(s => s.status === "available");
    if (!freeSlot) {
      return res.status(400).json({ message: "No slots available" });
    }

    // ✅ Properly cast userId to ObjectId
    freeSlot.user = new mongoose.Types.ObjectId(userId);
    freeSlot.status = "reserved";
    freeSlot.reservedAt = new Date();

    await deal.save();

    res.json({
      message: "Slot reserved",
      availableSlots: deal.slots.filter(s => s.status === "available").length,
      deal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/* =========================
   CONFIRM SLOT PAYMENT
========================= */
export const confirmSlotPayment = async (req, res) => {
  try {
    const { dealId, userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const deal = await GroupDeal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    const slot = deal.slots.find(
      s => s.user?.toString() === userId && s.status === "reserved"
    );

    if (!slot) {
      return res.status(400).json({ message: "No reserved slot found" });
    }

    slot.status = "paid";
    slot.paidAt = new Date();

    // Auto-complete deal if all paid
    if (deal.slots.every(s => s.status === "paid")) {
      deal.status = "completed";
    }

    await deal.save();

    res.json({
      message: "Payment confirmed",
      dealStatus: deal.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};







/* =========================
   GET ACTIVE GROUP DEALS
========================= */
export const getActiveGroupDeals = async (req, res) => {
  try {
    const now = new Date();

    const deals = await GroupDeal.find({
      status: "active",
      expiresAt: { $gt: now },
    })
      .populate("vendor")
      .sort({ createdAt: -1 });

    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



/* =========================
   GET GROUP DEALS BY VENDOR
========================= */
export const getGroupDealsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const deals = await GroupDeal.find({ vendor: vendorId })
      .populate("vendor")
      .sort({ createdAt: -1 });

    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const deleteGroupDeal = async (req, res) => {
  try {
    const { id } = req.params;

    const deal = await GroupDeal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: "Group deal not found" });
    }

    // ❌ Prevent deletion if anyone has paid
    const hasPaidSlot = deal.slots.some((slot) => slot.status === "paid");
    if (hasPaidSlot) {
      return res.status(400).json({
        message: "Cannot delete deal with paid slots",
      });
    }

    // 🔻 Update vendor totalDeals
    if (deal.vendor) {
      await Vendor.findByIdAndUpdate(deal.vendor, {
        $inc: { totalDeals: -1 },
      });
    }

    // Delete deal
    await deal.deleteOne();

    res.json({ message: "Group deal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
