import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import https from "https";
import { Resend } from "resend";
import jwt from "jsonwebtoken";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import puppeteer from "puppeteer";


const resend = new Resend(process.env.RESEND_API_KEY);


// ✅ Import models
import User from "./model/userSchema.js";

// ✅ Import routes
import dealsRoute from "./route/DealsRoute.js";
import forumRoute from "./route/forumRoute.js";
import vendorRoute from "./route/vendorRoute.js";
import curatedCollectionRoute from "./route/curatedCollectionRoute.js";
import couponRoutes from "./route/couponRoute.js";
import vendorPlanRoutes from "./route/VendorPlanRoute.js";
import heroRoutes from "./route/heroRoute.js";
import orderRouter from "./route/orderRoute.js";
import groupDealsRoute from "./route/groupDealsRoute.js";
import trendignSearchRoute from "./route/trendingSearchRoute.js";

// ✅ Load env variables
dotenv.config();

// ✅ Create express app
const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: ["https://deals-hub-9i9n.vercel.app", "https://slyce-sandy.vercel.app", "http://localhost:3000",],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);



app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);





// 🟢 Initialize Paystack transaction
app.post("/api/paystack/initialize", (req, res) => {
  const { email, amount } = req.body;

  const params = JSON.stringify({
    email,
    amount: amount * 100, // Paystack expects amount in kobo
  });

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transaction/initialize",
    method: "POST",
    headers: {
       Authorization: `Bearer sk_test_2b5cd3453cf3d9153fe1831810eff84da6ec0c19`,
      "Content-Type": "application/json",
    },
  };

  const paystackReq = https.request(options, (paystackRes) => {
    let data = "";

    paystackRes.on("data", (chunk) => {
      data += chunk;
    });

    paystackRes.on("end", () => {
      const result = JSON.parse(data);
      if (result.status) {
        res.status(200).json({
          status: true,
          message: "Transaction initialized",
          data: result.data,
        });
      } else {
        res.status(400).json(result);
      }
    });
  });

  paystackReq.on("error", (error) => {
    console.error(error);
    res.status(500).json({ status: false, error });
  });

  paystackReq.write(params);
  paystackReq.end();
});





// 🟢 Verify transaction (optional, but recommended)
app.get("/api/paystack/verify/:reference", (req, res) => {
  const { reference } = req.params;

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: "GET",
    headers: {
     Authorization: `Bearer sk_test_2b5cd3453cf3d9153fe1831810eff84da6ec0c19`,
    },
  };

  const verifyReq = https.request(options, (verifyRes) => {
    let data = "";

    verifyRes.on("data", (chunk) => {
      data += chunk;
    });

    verifyRes.on("end", () => {
      res.json(JSON.parse(data));
    });
  });

  verifyReq.on("error", (error) => {
    console.error(error);
    res.status(500).json({ error });
  });

  verifyReq.end();
});




// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

/**
 * ✅ Google Strategy
 * - Checks if user exists by googleId or email
 * - Creates user if not found
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:5000/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;

        // ✅ Check if user exists
        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.create({
            googleId,
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            email,
            photo: profile.photos?.[0]?.value,
          });

          console.log("🆕 New Google user created:", email);
        } else {
          console.log("✅ Existing Google user logged in:", email);
        }

        return done(null, user);
      } catch (error) {
        console.error("❌ Error saving Google user:", error);
        return done(error, null);
      }
    }
  )
);

// ✅ Serialize/Deserialize user
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});





// ✅ Send Magic Link
app.post("/api/auth/magiclink", async (req, res) => {
  const { email } = req.body;
  console.log("📩 Magic link request received for:", email);

  try {
    let user = await User.findOne({ email });
    console.log("🔍 User found:", user ? true : false);

    // Auto-create user if not found
    if (!user) {
      console.log("➕ Creating new user for email:", email);
      user = await User.create({
        email,
        displayName: email.split("@")[0], // fallback name
        firstName: email.split("@")[0],
        lastName: "",
        photo: "",
        status: "active",
        role: "User",
        type: "regular",
        dealsCount: 3,
        dealsPosted: 0,
      });
      console.log("✅ User created:", user);
    }

    // Generate one-time magic token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.magicTokenHash = tokenHash;
    user.magicTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    console.log("🔑 Magic token generated and saved for user:", user.email);
    console.log("🔗 Magic link:", `https://dealshub-server.onrender.com/api/auth/verify-magic?token=${rawToken}`);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Login <onboarding@resend.dev>",
      to: email,
      subject: "Your Magic Login Link",
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h2>🔑 Magic Link Login</h2>
          <p>Hello ${user.displayName},</p>
          <p>Click below to securely log in:</p>
          <a href="https://dealshub-server.onrender.com/api/auth/verify-magic?token=${rawToken}" style="padding:12px 20px;background:#4E61D3;color:#fff;border-radius:6px;text-decoration:none">
            Log In
          </a>
          <p style="margin-top:12px;font-size:12px;color:#666">
            This link expires in 10 minutes.
          </p>
        </div>
      `,
    });

    console.log("📤 Resend response:", emailResponse);

    res.json({ message: "Magic link sent" });
  } catch (err) {
    console.error("❌ Magic link error:", err);
    res.status(500).json({ message: "Failed to send magic link" });
  }
});




app.get("/api/auth/verify-magic", async (req, res) => {
  const { token } = req.query;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      magicTokenHash: tokenHash,
      magicTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired link" });
    }

    // Invalidate token
    user.magicTokenHash = undefined;
    user.magicTokenExpires = undefined;
    await user.save();

    const sessionToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: user.role,
        type: user.type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // ✅ Best UX: redirect to frontend
    res.redirect(
      `https://dealshub-server.onrender.com/callback?token=${sessionToken}&userId=${user._id}`
    );
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired link" });
  }
});



/**
 * ✅ Local Signup Route
 */
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Create new user
    user = await User.create({ name, email, password });

    // ✅ Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("name email type dealsCount role status dealsPosted plan createdAt");

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});




app.put("/api/users/:id", async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    const { id } = req.params;

    // Validate input
    if (!email && !firstName && !lastName) {
      return res.status(400).json({ message: "Please provide at least one field to update" });
    }

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { email, firstName, lastName } },
      { new: true, runValidators: true, fields: "name email firstName lastName type dealsCount role status dealsPosted createdAt" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Get user by ID (just to get dealsCount or other info)
app.get("/api/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("dealsCount dealsPosted type plan name email");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



app.post("/api/users/:userId/preferences", async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ message: "Preferences must be an array of strings" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true, fields: "preferences" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Preferences saved successfully",
      preferences: updatedUser.preferences,
    });
  } catch (err) {
    console.error("❌ Error saving preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
});




app.get("/api/users/:userId/preferences", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("preferences");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User preferences fetched successfully",
      preferences: user.preferences,
    });
  } catch (err) {
    console.error("❌ Error fetching preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.patch("/api/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be 'active' or 'suspended'.",
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("name email type status dealsCount dealsPosted createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: `✅ User status updated to '${status}' successfully`,
      user,
    });
  } catch (err) {
    console.error("❌ Error updating user status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.put("/api/decrement-deals/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { dealsCount: -1 } }, // decrement by 1
      { new: true } // return the updated document
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Deals count decremented", user });
  } catch (err) {
    console.error("❌ Error decrementing dealsCount:", err);
    res.status(500).json({ message: "Server error" });
  }
});



app.put("/api/increment-deals-posted/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { dealsPosted: 1 } }, // increment by 1
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Deals posted incremented", user });
  } catch (err) {
    console.error("❌ Error incrementing dealsPosted:", err);
    res.status(500).json({ message: "Server error" });
  }
});




app.put("/api/update-user-type/:userId", async (req, res) => {
  const { userId } = req.params;
  const { brand, plan } = req.body; // ✅ get plan from body

  if (!brand) {
    return res
      .status(400)
      .json({ message: "Brand (business name) is required" });
  }

  // Optional: validate plan
  const allowedPlans = ["free", "premium", "pro"];
  if (plan && !allowedPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        type: "vendor",
        brand,
        ...(plan && { plan }), // ✅ only update plan if provided
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * ✅ Google OAuth Flow
 */
// Start OAuth flow
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// OAuth callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/unauthorized" }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Safe user object (NOW INCLUDES PLAN)
      const safeUser = {
        _id: req.user._id,
        name: req.user.displayName || req.user.name,
        email: req.user.email,
        photo: req.user.photo || null,
        type: req.user.type,
        role: req.user.role,
        brand: req.user.brand,
        status: req.user.status,
        plan: req.user.plan || "free",
        dealsCount: req.user.dealsCount || 0,
        dealsPosted: req.user.dealsPosted || 0,
      };

      // Determine redirect
      const redirectPath =
        req.user.preferences && req.user.preferences.length > 0
          ? "/"
          : "/Preferences";

      const redirectUrl = `http://localhost:3000${redirectPath}?user=${encodeURIComponent(
        JSON.stringify(safeUser)
      )}&token=${token}`;

      console.log("🔁 Redirecting user to:", redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("❌ Google callback error:", error);
      return res.redirect("/unauthorized");
    }
  }
);


// Unauthorized
app.get("/unauthorized", (req, res) => {
  res.status(403).send("Access denied. You are not authorized to use this app.");
});

// Protected route example
app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/");
  res.send(`<h1>Hello ${req.user.displayName || req.user.name}</h1>`);
});



// Reusable browser instance
let browser;

const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      userDataDir: "./puppeteer_data", // avoids the "already running" error
    });
  }
  return browser;
};

// Universal sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post("/api/analyze-url", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "URL required" });

  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Use universal sleep instead of Puppeteer wait methods
    await sleep(2000);

    const data = await page.evaluate(() => {
      const getMeta = (name) =>
        document.querySelector(`meta[name='${name}']`)?.getAttribute("content") ||
        document.querySelector(`meta[property='${name}']`)?.getAttribute("content") ||
        "";

      const title = getMeta("og:title") || getMeta("twitter:title") || document.title || "";
      const description = getMeta("description") || getMeta("og:description") || "";
      const images = Array.from(document.images).map((img) => img.src).slice(0, 5);
      const price = getMeta("product:price:amount") || getMeta("og:price:amount") || "";
      const availability = getMeta("og:availability") || "In Stock";

      return {
        title,
        description,
        originalPrice: price,
        currentPrice: price,
        images,
        category: "",
        brand: "",
        availability,
        shippingCost: "0.00",
      };
    });

    await page.close();
    res.json(data);
  } catch (err) {
    console.error("Failed to analyze URL:", err);
    res.status(500).json({ message: "Failed to analyze URL" });
  }
});

// Graceful shutdown to close the browser
const closeBrowser = async () => {
  if (browser) await browser.close();
};
process.on("exit", closeBrowser);
process.on("SIGINT", () => { closeBrowser().then(() => process.exit()); });
process.on("SIGTERM", () => { closeBrowser().then(() => process.exit()); });



// Logout
app.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

// ✅ API routes
app.use("/api/deals", dealsRoute);
app.use("/api/forum", forumRoute);
app.use("/api/vendors", vendorRoute);
app.use("/api/curated-categories", curatedCollectionRoute);
app.use("/api/coupons", couponRoutes);
app.use("/api/vendor-plans", vendorPlanRoutes);
app.use("/api/heroes", heroRoutes);
app.use("/api/orders", orderRouter);
app.use("/api/group-deals", groupDealsRoute);
app.use("/api/trending", trendignSearchRoute);

// ✅ Root endpoint
app.get("/api", (req, res) => {
  res.send("✅ DealsHub API is running...");
});

// ✅ MongoDB connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
