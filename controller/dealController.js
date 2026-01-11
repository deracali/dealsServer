import mongoose from "mongoose";
import Deal from "../model/DealSchema.js";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import Vendor from "../model/VendorSchema.js";
import streamifier from "streamifier";

dotenv.config();






cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: upload with timeout, sequential, fallback
const uploadMediaWithTimeout = async (file) => {
  const start = Date.now();
  const TIMEOUT_MS = 30000; // 30s per file

  const isVideo = file.mimetype && file.mimetype.startsWith("video/");
  const folder = isVideo ? "deal_videos" : "deal_images";

  const streamUpload = () =>
    new Promise((resolve, reject) => {
      try {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder,
            resource_type: isVideo ? "video" : "image",
            timeout: 120000,
            transformation: !isVideo ? [{ width: 1080, quality: "auto" }] : undefined,
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
      resource_type: isVideo ? "video" : "image",
      timeout: 120000,
      transformation: !isVideo ? [{ width: 1080, quality: "auto" }] : undefined,
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

// Main createDeal
export const createDeal = async (req, res) => {
  try {
    console.log("📸 Incoming Files (req.files):", req.files);
    console.log("📥 Incoming body (req.body):", req.body);

    // Images (optional)
    const files = req.files && req.files.images
      ? (Array.isArray(req.files.images) ? req.files.images : [req.files.images])
      : [];

    console.log(`📂 Will upload ${files.length} file(s)`);

    // Sequential upload
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`⏳ Starting upload ${i+1}/${files.length} (${file.originalname || file.name}) size ${(file.size/1024).toFixed(1)} KB`);
      const url = await uploadMediaWithTimeout(file);
      imageUrls.push(url);
    }

    console.log("📸 All uploads complete:", imageUrls);

    // Parse specifications
    let specifications = {};
    if (req.body.specifications) {
      try {
        specifications = typeof req.body.specifications === "string"
          ? JSON.parse(req.body.specifications)
          : req.body.specifications;
      } catch (err) {
        console.warn("⚠️ Failed to parse specifications JSON:", err);
      }
    }

    // Parse tags
    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === "string"
          ? JSON.parse(req.body.tags)
          : req.body.tags;
      } catch (err) {
        console.warn("⚠️ Failed to parse tags JSON:", err);
        if (typeof req.body.tags === "string") {
          tags = req.body.tags.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    }



    // Parse colors
let colors = [];
if (req.body.colors) {
  try {
    colors = typeof req.body.colors === "string"
      ? JSON.parse(req.body.colors)
      : req.body.colors;
  } catch (err) {
    console.warn("⚠️ Failed to parse colors JSON:", err);
    if (typeof req.body.colors === "string") {
      colors = req.body.colors.split(",").map(c => c.trim()).filter(Boolean);
    }
  }
}

// Parse sizes
let sizes = [];
if (req.body.sizes) {
  try {
    sizes = typeof req.body.sizes === "string"
      ? JSON.parse(req.body.sizes)
      : req.body.sizes;
  } catch (err) {
    console.warn("⚠️ Failed to parse sizes JSON:", err);
    if (typeof req.body.sizes === "string") {
      sizes = req.body.sizes.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
}


    // Normalize createdBy
    let createdBy = req.body.createdBy;
    if (createdBy && typeof createdBy === "object" && createdBy._id) {
      createdBy = createdBy._id;
    }

    // Parse booleans and numbers
    const parseBoolean = val => val === true || val === "true" || val === "1" || val === 1;
    const freeShipping = parseBoolean(req.body.freeShipping);
    const originalPrice = req.body.originalPrice ? Number(req.body.originalPrice) : undefined;
    const discountedPrice = req.body.discountedPrice ? Number(req.body.discountedPrice) : undefined;
    const discountPercentage = req.body.discountPercentage ? Number(req.body.discountPercentage) : undefined;
    const shippingCost = req.body.shippingCost !== undefined
      ? (Number(req.body.shippingCost).toFixed ? Number(req.body.shippingCost).toFixed(2) : String(req.body.shippingCost))
      : undefined;
    const availability = ["In Stock", "Out of Stock"].includes(req.body.availability)
      ? req.body.availability
      : "In Stock";
    const expirationDate = req.body.expirationDate || undefined;
    const expiresAt = expirationDate ? new Date(expirationDate) : undefined;

    // Build deal object
    const dealData = {
      url: req.body.url || undefined,
      title: req.body.title,
      description: req.body.description || undefined,
      images: imageUrls,
      category: req.body.category || undefined,
      tags,
      colors,
sizes,
      originalPrice,
      discountedPrice,
      discountPercentage,
      currency: req.body.currency || "USD",
      currencySymbol: req.body.currencySymbol || "$",
      shippingCost: shippingCost !== undefined ? shippingCost : "0.00",
      couponCode: req.body.couponCode || undefined,
      affiliateUrl: req.body.affiliateUrl || undefined,
      brand: req.body.brand || undefined,
      platform: req.body.platform || undefined,
      specifications,
      availability,
      expirationDate,
      expiresAt,
      freeShipping: !!freeShipping,
      createdBy,
      status: req.body.status || "pending",
    };

    console.log("🔧 Normalized dealData to save:", dealData);

    const deal = await Deal.create(dealData);
    console.log("🎉 Deal created:", deal._id);

    return res.status(201).json(deal);
  } catch (err) {
    console.error("❌ Error creating deal:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};





// ✅ Get all deals for a vendor (by matching postedBy and createdBy)
export const getVendorDealCount = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // 1️⃣ Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // 2️⃣ Get number of deals using vendor brand instead of postedBy
    const totalDeals = await Deal.countDocuments({ createdBy: vendor.postedBy })

    // 3️⃣ Return count
    return res.status(200).json({
      message: "✅ Vendor deal count fetched successfully",
      vendor: {
        id: vendor._id,
        name: vendor.name,
        brand: vendor.brand,
      },
      totalDeals,
    });
  } catch (err) {
    console.error("❌ Error fetching vendor deal count:", err);
    res.status(500).json({ message: err.message });
  }
};



// ✅ Update deal status (pending → active)
export const approveDeal = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deal first
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    // If it's already active, no need to update
    if (deal.status === "active") {
      return res.status(400).json({ message: "Deal is already active" });
    }

    // Update status
    deal.status = "active";
    deal.updatedBy = req.user?.id || null; // optional if you're tracking admin updates
    await deal.save();

    res.status(200).json({
      message: "✅ Deal status updated to active successfully",
      deal,
    });
  } catch (err) {
    console.error("❌ Error updating deal status:", err);
    res.status(500).json({ message: err.message });
  }
};


export const rejectDeal = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deal first
    const deal = await Deal.findById(id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    // If it's already rejected, no need to update
    if (deal.status === "rejected") {
      return res.status(400).json({ message: "Deal is already rejected" });
    }

    // Update status
    deal.status = "rejected";
    deal.updatedBy = req.user?.id || null; // optional: track which admin rejected
    await deal.save();

    res.status(200).json({
      message: "🚫 Deal has been rejected successfully",
      deal,
    });
  } catch (err) {
    console.error("❌ Error rejecting deal:", err);
    res.status(500).json({ message: err.message });
  }
};



// ✅ Get All Deals (with filters, search, pagination)
export const getDeals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'newest',
      minPrice,
      maxPrice,
      minDiscount,
      maxDiscount,
      brand,
      platform,
      showSavedOnly
    } = req.query;

    const filter = {};

    // Category filter
    if (category && category !== 'all') {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }


    // Exact brand filter
    if (brand) filter.brand = brand;

    // Exact platform filter
    if (platform) filter.platform = platform;

    // Search filter (title, description, brand, platform)
    if (search) {
      const regex = new RegExp(search, 'i'); // case-insensitive
      filter.$or = [
        { title: regex },
        { description: regex },
        { brand: regex },
        { platform: regex },
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.discountedPrice = {};
      if (minPrice) filter.discountedPrice.$gte = Number(minPrice);
      if (maxPrice) filter.discountedPrice.$lte = Number(maxPrice);
    }

    // Discount range filter
    if (minDiscount || maxDiscount) {
      filter.discountPercentage = {};
      if (minDiscount) filter.discountPercentage.$gte = Number(minDiscount);
      if (maxDiscount) filter.discountPercentage.$lte = Number(maxDiscount);
    }

    // Saved only filter
    if (showSavedOnly === 'true') filter.isSaved = true;

    // Sorting
    let sort = { createdAt: -1 }; // default newest
    switch (sortBy) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'price-low':
        sort = { discountedPrice: 1 };
        break;
      case 'price-high':
        sort = { discountedPrice: -1 };
        break;
      case 'discount-high':
        sort = { discountPercentage: -1 };
        break;
      case 'discount-low':
        sort = { discountPercentage: 1 };
        break;
      case 'popularity':
        sort = { views: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const deals = await Deal.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    const total = await Deal.countDocuments(filter);

    res.json({
      deals,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




export const getDealsByBrand = async (req, res) => {
  try {
    const { brandName } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    if (!brandName) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    // Case-insensitive partial match
    const filter = { brand: { $regex: brandName.trim(), $options: 'i' } };

    // Sorting
    let sort = { createdAt: -1 };
    switch (sortBy) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'price-low':
        sort = { discountedPrice: 1 };
        break;
      case 'price-high':
        sort = { discountedPrice: -1 };
        break;
      case 'discount-high':
        sort = { discountPercentage: -1 };
        break;
      case 'discount-low':
        sort = { discountPercentage: 1 };
        break;
      case 'popularity':
        sort = { views: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const deals = await Deal.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    const total = await Deal.countDocuments(filter);

    res.json({
      deals,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ Get Single Deal (increment views)
export const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ); // no populate

    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// GET /api/deals/by-user/:userId
export const getDealsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all deals created by that user
    const deals = await Deal.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "displayName email photo");

    if (!deals.length) {
      return res.status(404).json({ message: "No deals found for this user" });
    }

    res.status(200).json({ count: deals.length, deals });
  } catch (err) {
    console.error("❌ Error fetching deals by user:", err);
    res.status(500).json({ message: err.message });
  }
};




// ✅ Update Deal
export const updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Delete Deal
export const deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ message: "Deal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Like / Unlike Deal
export const toggleLike = async (req, res) => {
  try {
    const { userId } = req.body; // read userId from request
    if (!userId) return res.status(401).json({ message: "Unauthorized: user not found" });

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    // Toggle like
    const alreadyLiked = deal.likes.some(id => id.toString() === userId.toString());
    if (alreadyLiked) {
      deal.likes.pull(userId);
    } else {
      deal.likes.push(userId);
    }

    await deal.save();
    res.json({ likes: deal.likes.length });

  } catch (err) {
    console.error("toggleLike error:", err);
    res.status(500).json({ error: err.message });
  }
};


export const getFeaturedDeals = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const deals = await Deal.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.status(200).json({ deals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Add Comment
export const addComment = async (req, res) => {
  try {
    console.log("Received request to add deal comment:", req.body);

    const { id: dealId } = req.params;
    const { author, comment, parentCommentId } = req.body;

    // ✅ Validate required fields
    if (!author?.name || !comment || comment.trim() === "") {
      return res.status(400).json({
        message: "Author name and comment are required."
      });
    }

    // ✅ Handle parentCommentId if provided
    let parentId = null;
    if (parentCommentId && parentCommentId !== "0") {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parentCommentId" });
      }
      parentId = new mongoose.Types.ObjectId(parentCommentId);
    }

    // ✅ Find the deal
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found." });
    }

    // ✅ Build the comment object exactly like ForumPost version
    const newComment = {
      author: {
        userId: author.userId || null,
        name: author.name,
        image: author.image || "https://via.placeholder.com/40",
        isVerified: Boolean(author.isVerified || false),
        reputation: author.reputation || 0,
      },
      comment: comment.trim(),
      parentCommentId: parentId,
      date: new Date(),
    };

    // ✅ Push to comments array
    deal.comments.push(newComment);

    // ✅ Save deal
    await deal.save();

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error adding deal comment:", error);

    // Optional: more detailed validation error handling
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        error: error.errors,
      });
    }

    return res.status(500).json({
      message: "Failed to add comment.",
      error,
    });
  }
};



function buildNestedComments(flatComments) {
  const byId = {};
  const nested = [];

  // Step 1: Deduplicate & init replies
  flatComments.forEach(c => {
    const id = c._id.toString();
    if (!byId[id]) {
      byId[id] = {
        ...c,
        _id: id,
        parentCommentId: c.parentCommentId
          ? c.parentCommentId.toString()
          : null,
        replies: [],
      };
    }
  });

  // Step 2: Build tree
  Object.values(byId).forEach(c => {
    if (c.parentCommentId && byId[c.parentCommentId]) {
      byId[c.parentCommentId].replies.push(c);
    } else {
      nested.push(c);
    }
  });

  // Step 3: Sort by date (oldest → newest)
  const sortByDate = arr =>
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));

  const recursiveSort = arr => {
    sortByDate(arr);
    arr.forEach(c => recursiveSort(c.replies));
  };

  recursiveSort(nested);

  return nested;
}


// GET /api/deals/:id/comments
export const getComments = async (req, res) => {
  try {
    const { id: dealId } = req.params;

    const deal = await Deal.findById(dealId).lean();
    if (!deal) {
      return res.status(404).json({ message: "Deal not found." });
    }

    const nestedComments = buildNestedComments(
      deal.comments.map(c => ({
        _id: c._id,
        author: c.author,
        comment: c.comment,
        parentCommentId: c.parentCommentId,
        date: c.date,
        likes: c.likes || 0,
        dislikes: c.dislikes || 0,
        hasUserLiked: c.hasUserLiked || [],
        hasUserDisliked: c.hasUserDisliked || [],
      }))
    );

    return res.status(200).json(nestedComments);
  } catch (error) {
    console.error("Error fetching deal comments:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve comments.", error });
  }
};


// ==========================
// LIKE DEAL COMMENT
// ==========================
export const likeDealComment = async (req, res) => {
  try {
    const { id: dealId, commentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(dealId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    // Find specific comment in the deal's comments array
    const comment = deal.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Ensure arrays exist
    if (!comment.hasUserLiked) comment.hasUserLiked = [];
    if (!comment.hasUserDisliked) comment.hasUserDisliked = [];

    const alreadyLiked = comment.hasUserLiked.includes(userId);
    const alreadyDisliked = comment.hasUserDisliked.includes(userId);

    // Toggle Like Logic
    if (alreadyLiked) {
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
      comment.hasUserLiked.pull(userId);
    } else {
      comment.likes = (comment.likes || 0) + 1;
      comment.hasUserLiked.push(userId);

      // Switch: Remove dislike if they previously disliked it
      if (alreadyDisliked) {
        comment.dislikes = Math.max(0, (comment.dislikes || 1) - 1);
        comment.hasUserDisliked.pull(userId);
      }
    }

    await deal.save();

    return res.status(200).json({
      message: "Comment like updated",
      likes: comment.likes,
      dislikes: comment.dislikes,
      hasUserLiked: comment.hasUserLiked,
      hasUserDisliked: comment.hasUserDisliked,
    });
  } catch (error) {
    console.error("❌ Like deal comment error:", error);
    return res.status(500).json({ message: "Failed to like comment" });
  }
};

// ==========================
// DISLIKE DEAL COMMENT
// ==========================
export const dislikeDealComment = async (req, res) => {
  try {
    const { id: dealId, commentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(dealId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    const comment = deal.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Ensure arrays exist
    if (!comment.hasUserLiked) comment.hasUserLiked = [];
    if (!comment.hasUserDisliked) comment.hasUserDisliked = [];

    const alreadyDisliked = comment.hasUserDisliked.includes(userId);
    const alreadyLiked = comment.hasUserLiked.includes(userId);

    // Toggle Dislike Logic
    if (alreadyDisliked) {
      comment.dislikes = Math.max(0, (comment.dislikes || 1) - 1);
      comment.hasUserDisliked.pull(userId);
    } else {
      comment.dislikes = (comment.dislikes || 0) + 1;
      comment.hasUserDisliked.push(userId);

      // Switch: Remove like if they previously liked it
      if (alreadyLiked) {
        comment.likes = Math.max(0, (comment.likes || 1) - 1);
        comment.hasUserLiked.pull(userId);
      }
    }

    await deal.save();

    return res.status(200).json({
      message: "Comment dislike updated",
      likes: comment.likes,
      dislikes: comment.dislikes,
      hasUserLiked: comment.hasUserLiked,
      hasUserDisliked: comment.hasUserDisliked,
    });
  } catch (error) {
    console.error("❌ Dislike deal comment error:", error);
    return res.status(500).json({ message: "Failed to dislike comment" });
  }
};





export const rateDeal = async (req, res) => {
  try {
    const { id: dealId } = req.params;
    const { userId, rating } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (![1, 2, 3, 4, 5].includes(Number(rating))) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    // Check if user already rated
    const existingRating = deal.ratings.find(
      r => r.userId.toString() === userId.toString()
    );

    if (existingRating) {
      // Update rating
      existingRating.value = Number(rating);
    } else {
      // New rating
      deal.ratings.push({ userId, value: Number(rating) });
      deal.ratingsCount += 1;
    }

    // Recalculate average rating
    const total = deal.ratings.reduce((sum, r) => sum + r.value, 0);
    deal.averageRating = Number((total / deal.ratings.length).toFixed(1));

    await deal.save();

    return res.status(200).json({
      message: "Rating saved successfully",
      averageRating: deal.averageRating,
      ratingsCount: deal.ratingsCount,
    });

  } catch (err) {
    console.error("❌ Rating error:", err);
    res.status(500).json({ message: err.message });
  }
};





// ✅ Upvote Deal
export const toggleUpvote = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const alreadyUpvoted = deal.upvotes.includes(req.user.id);
    if (alreadyUpvoted) {
      deal.upvotes.pull(req.user.id);
    } else {
      deal.upvotes.push(req.user.id);
    }

    await deal.save();
    res.json({ upvotes: deal.upvotes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
