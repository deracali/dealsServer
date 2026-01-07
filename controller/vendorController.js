import mongoose from "mongoose";
import Vendor from "../model/VendorSchema.js";
import cloudinary from "cloudinary";
import Deal from "../model/DealSchema.js";




// ====== Cloudinary Configuration ======
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ====== Helper Function: Upload Image to Cloudinary ======
const uploadImage = async (filePath, folderName = "vendors") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
    });
    return result.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err.message);
    throw new Error("Image upload failed");
  }
};

// ====== Create Vendor ======
export const createVendor = async (req, res) => {
  try {
    console.log("📩 Incoming Vendor Data:", req.body);
    console.log("📸 Incoming Files:", req.files);

    const {
      name,
      description,
      location,
      country,
      type,
      categories,
      postedBy,
      cacNumber,
      businessWebsite,
      businessPhone,
      businessEmail,
      businessAddress,
    } = req.body;

    // Initialize uploaded URLs
  let businessLogoUrl = "";
  let cacDocumentUrl = "";
  let businessBannerUrl = "";
  let identityImgUrl = "";
  let passportPhotoUrl = "";

  // Upload Business Logo
  if (req.files?.businessLogo) {
    businessLogoUrl = await uploadImage(req.files.businessLogo.tempFilePath, "vendor_logos");
  }

  // Upload CAC Document
  if (req.files?.cacDocument) {
    cacDocumentUrl = await uploadImage(req.files.cacDocument.tempFilePath, "vendor_documents");
  }

  // Upload Business Banner
  if (req.files?.businessBanner) {
    businessBannerUrl = await uploadImage(req.files.businessBanner.tempFilePath, "vendor_banners");
  }

  // Upload Identity Image (required)
  if (req.files?.identityImg) {
    identityImgUrl = await uploadImage(req.files.identityImg.tempFilePath, "vendor_identity");
  } else {
    return res.status(400).json({ message: "identityImg is required" });
  }

  // Upload Passport Photo (required)
  if (req.files?.passportPhoto) {
    passportPhotoUrl = await uploadImage(req.files.passportPhoto.tempFilePath, "vendor_passports");
  } else {
    return res.status(400).json({ message: "passportPhoto is required" });
  }

  // Create Vendor
  const vendor = await Vendor.create({
    name,
    description,
    location,
    country,
    type,
    categories: categories ? JSON.parse(categories) : [],
    postedBy,
    cacNumber,
    businessWebsite,
    businessPhone,
    businessEmail,
    businessAddress,
    businessLogo: businessLogoUrl,
    cacDocument: cacDocumentUrl,
    businessBanner: businessBannerUrl,
    identityImg: identityImgUrl,
    passportPhoto: passportPhotoUrl,
  });


    console.log("🎉 Vendor created successfully:", vendor._id);
    res.status(201).json(vendor);
  } catch (err) {
    console.error("❌ Error creating vendor:", err);
    res.status(500).json({ message: err.message });
  }
};

// ========== READ ALL (with filters, search, pagination) ==========
export const getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type, country } = req.query;

    // 🧩 Build query filter
    const filter = {};
    if (type) filter.type = type;
    if (country) filter.country = country;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { categories: { $regex: search, $options: "i" } },
      ];
    }

    // 🧭 Fetch vendors with pagination
    const vendors = await Vendor.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const count = await Vendor.countDocuments(filter);

    // 💡 Add deal count for each vendor
    const vendorsWithDealCount = await Promise.all(
      vendors.map(async (vendor) => {
        const totalDeals = await Deal.countDocuments({ createdBy: vendor.postedBy });
        return {
          ...vendor.toObject(),
          totalDeals, // add count
        };
      })
    );

    // ✅ Respond
    res.json({
      message: "✅ Vendors fetched successfully",
      data: vendorsWithDealCount,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("❌ Error fetching vendors:", err);
    res.status(500).json({ message: err.message });
  }
};



// ========== READ ONE ==========
export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ========== GET VENDOR BY NAME ==========
export const getVendorByName = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ message: "Vendor name is required" });
    }

    // 🔍 Case-insensitive exact match
    const vendor = await Vendor.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // 📦 Fetch deals created by this vendor
    const deals = await Deal.find({ createdBy: vendor.postedBy })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "✅ Vendor fetched successfully",
      vendor,
      totalDeals: deals.length,
      deals,
    });
  } catch (err) {
    console.error("❌ Error fetching vendor by name:", err);
    res.status(500).json({ message: err.message });
  }
};


// ========== UPDATE ==========
export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};




// ==========================
// ADD COMMENT (Vendor)
// ==========================
export const addVendorComment = async (req, res) => {
  try {
    console.log("Received request to add vendor comment:", req.body);

    const { id: vendorId } = req.params;
    const { author, comment, parentCommentId } = req.body;

    if (!author?.name || !comment) {
      return res
        .status(400)
        .json({ message: "Author name and comment are required." });
    }

    // Handle parentCommentId
    let parentId = null;
    if (parentCommentId && parentCommentId !== "0") {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parentCommentId" });
      }
      parentId = new mongoose.Types.ObjectId(parentCommentId);
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    const newComment = {
      author: {
        userId: author.userId || null,
        name: author.name,
        image: author.image || "https://example.com/avatar.png",
        isVerified: Boolean(author.isVerified || false),
        reputation: author.reputation || 0,
      },
      comment,
      parentCommentId: parentId,
      date: new Date(),
    };

    vendor.comments.push(newComment);
    await vendor.save();

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error adding vendor comment:", error);
    return res
      .status(500)
      .json({ message: "Failed to add comment.", error });
  }
};



// ==========================
// Helper: Build Nested Comments
// ==========================
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




// ==========================
// GET COMMENTS (Vendor)
// ==========================
export const getVendorComments = async (req, res) => {
  try {
    const { id: vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    const nestedComments = buildNestedComments(
      vendor.comments.map(c => ({
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
    console.error("Error fetching vendor comments:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve comments.", error });
  }
};



// ==========================
// LIKE VENDOR COMMENT
// ==========================
export const likeVendorComment = async (req, res) => {
  try {
    const { id: vendorId, commentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(vendorId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Locate the comment inside the subdocument array
    const comment = vendor.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Initialize arrays if they don't exist
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

      // Remove dislike if it exists
      if (alreadyDisliked) {
        comment.dislikes = Math.max(0, (comment.dislikes || 1) - 1);
        comment.hasUserDisliked.pull(userId);
      }
    }

    await vendor.save();

    return res.status(200).json({
      message: "Comment like updated",
      likes: comment.likes,
      dislikes: comment.dislikes,
      hasUserLiked: comment.hasUserLiked,
      hasUserDisliked: comment.hasUserDisliked,
    });
  } catch (error) {
    console.error("❌ Like vendor comment error:", error);
    return res.status(500).json({ message: "Failed to like comment" });
  }
};

// ==========================
// DISLIKE VENDOR COMMENT
// ==========================
export const dislikeVendorComment = async (req, res) => {
  try {
    const { id: vendorId, commentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(vendorId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const comment = vendor.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Initialize arrays if they don't exist
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

      // Remove like if it exists
      if (alreadyLiked) {
        comment.likes = Math.max(0, (comment.likes || 1) - 1);
        comment.hasUserLiked.pull(userId);
      }
    }

    await vendor.save();

    return res.status(200).json({
      message: "Comment dislike updated",
      likes: comment.likes,
      dislikes: comment.dislikes,
      hasUserLiked: comment.hasUserLiked,
      hasUserDisliked: comment.hasUserDisliked,
    });
  } catch (error) {
    console.error("❌ Dislike vendor comment error:", error);
    return res.status(500).json({ message: "Failed to dislike comment" });
  }
};


// ========== DELETE ==========
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
