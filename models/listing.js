const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");
const Booking = require("./booking");

const listingSchema = new Schema({
  title: String,
  description: String,
  price: Number,
  image: {
    url:String,
    filename:String,
  },
  location:String,
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref:"User",
  },
  // Laptops, Projectors, Drones and Audio are offered by both listing forms and
  // by the category cards on the home page, so leaving them out of the enum made
  // publishing throw a ValidationError.
  category:{
    type:String,
    enum:{
      values:["Electronics","Gym","Books","Sports","Hobbies","Bikes","Scooters","Cars","Cameras","Vehicles","Tools","Camping","Laptops","Projectors","Drones","Audio"],
      message:"{VALUE} isn't one of the categories we offer",
    }
  },
  isAvailable:{
    type:Boolean,
    default:true,
  }
});

listingSchema.post("findOneAndDelete", async(listing) => {
   if(listing){
      await Review.deleteMany({_id:{$in: listing.reviews}});
      await Booking.deleteMany({listing: listing._id});
   }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;