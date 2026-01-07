import VendorPlan from "../model/VendorPlan.js";

// 🟢 CREATE
export const createVendorPlan = async (req, res) => {
  try {
    const vendorPlan = new VendorPlan(req.body);
    await vendorPlan.save();
    res.status(201).json({ message: "Vendor plan created successfully", vendorPlan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🟢 READ ALL
export const getVendorPlans = async (req, res) => {
  try {
    const vendorPlans = await VendorPlan.find();
    res.status(200).json(vendorPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🟢 READ ONE
export const getVendorPlanById = async (req, res) => {
  try {
    const vendorPlan = await VendorPlan.findById(req.params.id);
    if (!vendorPlan) return res.status(404).json({ message: "Vendor plan not found" });
    res.status(200).json(vendorPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🟢 UPDATE
export const updateVendorPlan = async (req, res) => {
  try {
    const vendorPlan = await VendorPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!vendorPlan) return res.status(404).json({ message: "Vendor plan not found" });
    res.status(200).json({ message: "Vendor plan updated successfully", vendorPlan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🟢 DELETE
export const deleteVendorPlan = async (req, res) => {
  try {
    const vendorPlan = await VendorPlan.findByIdAndDelete(req.params.id);
    if (!vendorPlan) return res.status(404).json({ message: "Vendor plan not found" });
    res.status(200).json({ message: "Vendor plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
