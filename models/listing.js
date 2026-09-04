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
    __filename:String,
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
  category:{
    type:String,
    enum:["Electronics","Gym","Books","Sports","Hobbies","Bikes","Scooters","Cars","Cameras","Vehicles","Tools","Camping"]
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