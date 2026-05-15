const dns = require("dns");
const mongoose = require("mongoose");

// Some networks (school/corporate/ISP DNS) block SRV lookups for mongodb+srv URIs.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let connected = false;

mongoose.connection.on("error", (err) => {
  connected = false;
  console.error("[db] connection error:", err.message);
});

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "[warn] MONGODB_URI not set — database features disabled. Add it to .env to enable."
    );
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    connected = true;
    console.log("[db] Connected to MongoDB");
    return true;
  } catch (err) {
    connected = false;
    console.error("[db] MongoDB connection failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    return false;
  }
}

function isDbReady() {
  return connected && mongoose.connection.readyState === 1;
}

module.exports = { connectDb, isDbReady };
