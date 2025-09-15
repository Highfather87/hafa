import express from "express";
import multer from "multer";
import fs from "fs";

const app = express();
const PORT = 3000;

// Enable CORS (so your frontend can call API)
import cors from "cors";
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Multer setup for saving uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Simple JSON file for storing metadata
const DATA_FILE = "data.json";
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// Upload endpoint
app.post("/upload", upload.single("image"), (req, res) => {
  const { lng, lat, description } = req.body;
  const imageUrl = `/uploads/${req.file.filename}`;

  const newPoint = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
    properties: { description, imageUrl }
  };

  // Save to JSON database
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  data.push(newPoint);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  res.json({ success: true, point: newPoint });
});

// Endpoint to fetch all uploaded points
app.get("/points", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json({ type: "FeatureCollection", features: data });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));