const Listing = require("../models/listing");
const Booking = require("../models/booking");

module.exports.index = async (req, res) => {
  const { search, category } = req.query;
  let filter = {};
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: 'i' };
  const allListings = await Listing.find(filter);
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
     return res.redirect("/listings");
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

module.exports.createListing = async (req,res) => {
  // multer leaves req.file undefined when no file was chosen, and a rental
  // listing without a photo is not much use to anybody.
  if(!req.file){
    req.flash("error","Please add a photo of your item so renters can see what they're getting.");
    return res.redirect("/listings/new");
  }
  // req.body is {listing:{...}}, so the nested object is what the model wants —
  // handing it the wrapper meant Mongoose dropped every field as unknown and
  // saved a listing with no title, price or location.
  const newListing = new Listing(req.body.listing);
  newListing.owner=req.user._id;
  newListing.image = {url: req.file.path, filename: req.file.filename};
  await newListing.save();
  req.flash("success","New Listing Created!");
  res.redirect("/listings");
 };

module.exports.renderEditForm = async (req, res) => {
   const listing = await Listing.findById(req.params.id).populate("owner");
   if(!listing){
      req.flash("error","The listing you requested for does not exist");
      return res.redirect("/listings");
   }
   // Listings from the seed script, and any saved before uploads worked, have no
   // image at all.
   const originalImageUrl = listing.image && listing.image.url
     ? listing.image.url.replace("/upload","/upload/w_250")
     : null;
   res.render("listings/edit",{listing,originalImageUrl});
 };

module.exports.updateListing = async (req, res) => {
   const listing = await Listing.findByIdAndUpdate(
     req.params.id,
     req.body.listing,
     {runValidators: true, new: true}
   );
   if(!listing){
      req.flash("error","The listing you tried to update no longer exists");
      return res.redirect("/listings");
   }
   if(req.file){
    listing.image = {url: req.file.path, filename: req.file.filename};
    await listing.save();
   }
   req.flash("success","Listing Updated!");
   res.redirect(`/listings/${listing._id}`);
 };

module.exports.destroyListing = async (req, res) => {
   const listing = await Listing.findByIdAndDelete(req.params.id);
   if(!listing){
      req.flash("error","That listing has already been deleted");
      return res.redirect("/listings");
   }
   req.flash("success","Listing Deleted!");
   res.redirect("/listings");
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