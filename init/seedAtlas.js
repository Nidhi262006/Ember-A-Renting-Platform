if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const Listing = require("../models/listing");
const initData = require("./data");

const dbUrl = process.env.MONGO_URI;

async function seedAtlas() {
  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to Atlas");

    await Listing.insertMany(initData.data);

    console.log("Listings imported successfully");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

seedAtlas();