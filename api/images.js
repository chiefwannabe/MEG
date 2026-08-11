const { v2: cloudinary } = require('cloudinary');
const { URL } = require('url');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'zufqagki',
  api_key: process.env.CLOUDINARY_API_KEY || '235137835471656',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'rYYk93LYVC9L8-0FOOMEqJGiHEs',
});

const FOLDER = '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Parse query parameters if not pre-populated by framework
  if (!req.query) {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      req.query = Object.fromEntries(urlObj.searchParams.entries());
    } catch {
      req.query = {};
    }
  }

  if (req.method === 'GET') {
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

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        images,
        next_cursor: result.next_cursor || null,
        total: result.rate_limit_remaining,
      }));
    } catch (error) {
      console.error('Fetch error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Failed to fetch images' }));
    }
  }

  if (req.method === 'DELETE') {
    try {
      let publicId = req.query.publicId;
      if (!publicId) {
        const parts = req.url.split('/api/images/');
        if (parts.length > 1) {
          publicId = decodeURIComponent(parts[1].split('?')[0]);
        }
      }
      if (!publicId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Missing publicId' }));
      }
      const result = await cloudinary.uploader.destroy(publicId);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(result));
    } catch (error) {
      console.error('Delete error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Failed to delete image' }));
    }
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
};
