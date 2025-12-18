import express from "express";
import cors from "cors";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Supabase Client ---------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // IMPORTANT: service role, not anon
);

/* ---------- Multer (memory storage) ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/* ---------- POST /upload ---------- */
/*
  Expects multipart/form-data:
  - name
  - description
  - lng
  - lat
  - image (file)
*/
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { name, description, lng, lat } = req.body;

    if (!lng || !lat) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    let imageUrl = null;

    /* ---- Upload image to Supabase Storage ---- */
    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("landmark-images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("landmark-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    /* ---- Insert landmark into database ---- */
    const { data, error } = await supabase
      .from("landmarks")
      .insert([
        {
          name: name || "Unnamed Landmark",
          description: description || "",
          longitude: parseFloat(lng),
          latitude: parseFloat(lat),
          image_url: imageUrl
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, landmark: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- GET /landmarks ---------- */
/* Returns GeoJSON */
app.get("/landmarks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("landmarks")
      .select("*")
      .eq("approved", true); // Only approved landmarks

    if (error) throw error;

    const geojson = {
      type: "FeatureCollection",
      features: data.map(l => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [l.longitude, l.latitude]
        },
        properties: {
          Name: l.name,
          Description: l.description,
          Image: l.image_url
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Health Check ---------- */
app.get("/", (req, res) => {
  res.send("✅ Supabase landmarks API running");
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);