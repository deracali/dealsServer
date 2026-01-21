// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  displayName: String,
  firstName: String,
  lastName: String,
  email: {
    type: String,
    lowercase: true,
    required: true,
    unique: true,
  },
  magicTokenHash: String,
magicTokenExpires: Date,
  photo: String,
  dealsCount: {
    type: Number,
    default: 3,
  },
  type: {
  type: String,
  enum: ["regular", "vendor"],
  default: "regular",
},
brand: String,
status: {
   type: String,
   enum: ["active", "suspended"],
   default: "active",
 },
dealsPosted: {
    type: Number,
    default: 0,
  },
  plan: {
    type: String,
    enum: ["free", "premium", "pro"],
    default: "free",
  },
  preferences: {
  type: [String], // Array of category names
  default: [],    // Empty array by default
},
  role: {
     type: String,
     enum: ["Admin", "User"],
     default: "User",
   },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", userSchema);
