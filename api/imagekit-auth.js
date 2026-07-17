const ImageKit = require("@imagekit/nodejs");

module.exports = function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  // Enforce environment variables availability
  if (!publicKey || !privateKey || !urlEndpoint) {
    res.status(500).json({
      error: "Server configuration error: ImageKit environment variables are missing."
    });
    return;
  }

  try {
    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint
    });

    const authParameters = imagekit.helper.getAuthenticationParameters();
    
    // Send public key along with auth params so frontend does not need to hardcode it
    res.status(200).json({
      ...authParameters,
      publicKey
    });
  } catch (error) {
    console.error("[ImageKit Auth Error]:", error);
    res.status(500).json({ error: "Failed to generate authentication parameters", details: error.message });
  }
};
