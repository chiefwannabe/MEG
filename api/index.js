const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'zufqagki',
  api_key: process.env.CLOUDINARY_API_KEY || '235137835471656',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'rYYk93LYVC9L8-0FOOMEqJGiHEs',
});

const FOLDER = '';

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, GIF, or AVIF.' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: FOLDER,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      const readable = Readable.from(req.file.buffer);
      readable.pipe(uploadStream);
    });

    res.json({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      created_at: result.created_at,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// List images endpoint with cursor-based pagination
app.get('/api/images', async (req, res) => {
  try {
    const { next_cursor, max_results = 30 } = req.query;

    const options = {
      type: 'upload',
      prefix: FOLDER,
      max_results: parseInt(max_results),
      direction: -1,
    };

    if (next_cursor) {
      options.next_cursor = next_cursor;
    }

    const result = await cloudinary.api.resources(options);

    const images = result.resources.map((r) => ({
      public_id: r.public_id,
      secure_url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
      created_at: r.created_at,
      bytes: r.bytes,
    }));

    res.json({
      images,
      next_cursor: result.next_cursor || null,
      total: result.rate_limit_remaining,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image endpoint
app.delete('/api/images/*publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const result = await cloudinary.uploader.destroy(publicId);
    res.json(result);
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = app;
