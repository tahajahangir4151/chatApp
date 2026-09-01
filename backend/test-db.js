import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";

const testConnection = async () => {
  const uri = process.env.MONGO_URI;
  console.log("Testing connection...");
  
  if (!uri) {
    console.log("❌ MONGO_URI not found in .env");
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected successfully!");
    process.exit(0);
  } catch (error) {
    console.log("❌ Connection failed:", error.message);
    process.exit(1);
  }
};

testConnection();