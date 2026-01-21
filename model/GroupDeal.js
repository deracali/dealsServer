import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ===========================
   SLOT SUB-SCHEMA
=========================== */
const SlotSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // empty slot
    },
    status: {
      type: String,
      enum: ["available", "reserved", "paid"],
      default: "available",
    },
    reservedAt: Date,
    paidAt: Date,
  },
  { _id: false }
);

/* ===========================
   GROUP DEAL SCHEMA
=========================== */
const GroupDealSchema = new Schema(
  {
    /* BASIC INFO */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      required: true,
    },

    category: {
      type: String,
      default: "group-deals",
    },

    /* PRICING */
    originalPrice: {
      type: Number,
      required: true,
    },

    discountedPrice: {
      type: Number,
      required: true,
    },

    discountPercentage: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    /* GROUP / SLOT LOGIC */
    totalSlots: {
      type: Number,
      required: true, // e.g. 4 people
    },

    slots: {
      type: [SlotSchema],
      default: [],
    },

    /* DEAL STATUS */
    status: {
      type: String,
      enum: ["active", "pending", "completed", "expired"],
      default: "active",
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    /* SHIPPING */
    shippingType: {
      type: String,
      enum: ["free", "paid"],
      default: "paid",
    },

    shippingNote: {
      type: String,
      default: "Delivery fee excluded",
    },

    deliveryEstimate: {
      type: String,
      default: "2-3 business days",
    },

    /* VENDOR INFO */
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    vendorName: {
      type: String,
      required: true,
    },

    /* SOCIAL / TRUST */
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    commentsCount: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    /* ANALYTICS */
    views: {
      type: Number,
      default: 0,
    },

    /* AUDIT */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================
   AUTO-FILL SLOTS ON CREATE
=========================== */
GroupDealSchema.pre("save", function (next) {
  if (this.slots.length === 0 && this.totalSlots) {
    this.slots = Array.from({ length: this.totalSlots }).map(() => ({
      status: "available",
    }));
  }
  next();
});

export default model("GroupDeal", GroupDealSchema);
