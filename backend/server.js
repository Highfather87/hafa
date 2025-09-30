import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Ensure uploads and data folders exist
fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("data", { recursive: true });

const DATA_FILE = path.join("data", "landmarks.json");

// If no landmarks.json exists, initialize it
if (!fs.existsSync(DATA_FILE)) {
  const empty = { type: "FeatureCollection", features: [] };
  fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2));
}

// Multer setup for saving uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const safeName = (req.body.name || "landmark")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueName = `${safeName}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

/**
 * POST /upload
 * Upload a landmark (name, description, lng, lat, image)
 */
app.post("/upload", upload.single("image"), (req, res) => {
  const { name, description, lng, lat } = req.body;

  const newFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)]
    },
    properties: {
      Name: name || "Unnamed Landmark",
      Description: description || "",
      Image: req.file ? `/uploads/${req.file.filename}` : null
    }
  };

  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  data.features.push(newFeature);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json({ success: true, feature: newFeature });
});

/**
 * GET /landmarks
 * Returns all saved landmarks as GeoJSON
 */
app.get("/landmarks", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data);
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));