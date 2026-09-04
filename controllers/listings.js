const Listing = require("../models/listing");
const Booking = require("../models/booking");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
};

module.exports.renderNewForm = async(req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id)
  .populate({path:"reviews",
    populate: {
      path:"author",
    },
  })
  .populate("owner");
  if(!listing){
     req.flash("error","The listing you requested for does not exist");
     res.redirect("/listing");
  }
  // Dates already promised to somebody else, so the booking card can say so
  // before the visitor picks them.
  const bookedRanges = await Booking.find({
    listing: req.params.id,
    status: "approved",
    endDate: { $gte: new Date() },
  }).sort({ startDate: 1 });
  res.render("listings/show", { listing, bookedRanges });
};

module.exports.createListing = async (req,res,next) => {
  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(req.body);
  newListing.owner=req.user._id;
  newListing.image = {url,filename};
  await newListing.save();
  req.flash("success","New Listing Created!");
  res.redirect("/listings");
 };

module.exports.renderEditForm = async (req, res) => {
   const listing = await Listing.findById(req.params.id).populate("owner");
   if(!listing){
      req.flash("error","The listing you requested for does not exist");
      res.redirect("/listing");
   }
   let originalImageUrl = listing.image.url;
   originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250");;
   res.render("listings/edit.js",{listing,originalImageUrl});
 };

module.exports.updateListing = async (req, res) => {
   let {id} = req.params;
   let listing = await Listing.findByIdAndUpdate(req.params.id, req.body);
   if(typeof req.file !=="undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url,filename};
    await listing.save();
   }
   req.flash("success","Listing Updated!");
   res.redirect(`/listings/${req.params.id}`);
 };

module.exports.destroyListing = async (req, res) => {
   await Listing.findByIdAndDelete(req.params.id);
   req.flash("success","Listing Deleted!");
   res.redirect("/listings");
 };
 // In index controller
module.exports.index = async (req, res) => {
  const { search, category } = req.query;
  let filter = {};
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: 'i' };
  const allListings = await Listing.find(filter);
  res.render("listings/index", { allListings });
};

// Owner switch for pausing a listing, so nobody can book it while it is away
// for repairs, lent out offline, etc.
module.exports.toggleAvailability = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if(!listing){
    req.flash("error","The listing you requested for does not exist");
    return res.redirect("/listings");
  }
  if(!listing.owner || !listing.owner.equals(req.user._id)){
    req.flash("error","You don't have permission to change this listing");
    return res.redirect(`/listings/${listing._id}`);
  }

  listing.isAvailable = !listing.isAvailable;
  await listing.save();

  req.flash("success", listing.isAvailable
    ? "Listing is available for booking again."
    : "Listing marked unavailable. Nobody can book it until you turn it back on.");
  res.redirect(`/listings/${listing._id}`);
};