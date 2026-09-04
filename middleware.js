const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const formatJoiError = require("./utils/formatJoiError.js");
const {listingSchema,reviewSchema,bookingSchema} = require("./schema.js");

module.exports.isLoggedIn=(req,res,next) => {
    if(!req.isAuthenticated()){
    req.session.redirectUrl = req.originalUrl;
    req.flash("error","You must be logged in to create a new listing!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req,res,next)=>{
  if(req.session.redirectUrl){
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async(req,res,next) =>{
  let{id} = req.params;
  let listing = await Listing.findById(id);
  if(!listing){
    req.flash("error","That listing no longer exists");
    return res.redirect("/listings");
  }
  // Listings created by the seed script have no owner, so nobody may edit them.
  if(!listing.owner || !listing.owner.equals(res.locals.currUser._id)){
    req.flash("error","You don't have permission to edit");
    return res.redirect(`/listings/${req.params.id}`);
  }
  next();
}

// Joi only checks the shape of a submission. Rather than dropping the visitor on
// an error page, send them back to the form they came from with a readable list
// of what was wrong. abortEarly:false so every problem is reported at once
// instead of one per attempt.
const rejectInvalid = (req,res,schema,backUrl) => {
  let {error} = schema.validate(req.body || {},{abortEarly:false});
  if(!error){
    return false;
  }
  req.flash("error",formatJoiError(error));
  res.redirect(backUrl);
  return true;
}

module.exports.validateListing = (req,res,next) => {
  // req.params.id is only set on the update route, so this lands the visitor
  // back on whichever form they submitted.
  const backUrl = req.params.id ? `/listings/${req.params.id}/edit` : "/listings/new";
  if(rejectInvalid(req,res,listingSchema,backUrl)){
    return;
  }
  next();
}

module.exports.validateReview = (req,res,next) => {
  if(rejectInvalid(req,res,reviewSchema,`/listings/${req.params.id}`)){
    return;
  }
  next();
}

module.exports.isReviewAuthor = async(req,res,next) =>{
  let{id,reviewId} = req.params;
  let review = await Review.findById(reviewId);
  if(!review){
    req.flash("error","That review no longer exists");
    return res.redirect(`/listings/${id}`);
  }
  if(!review.author || !review.author.equals(res.locals.currUser._id)){
    req.flash("error","You didn't create this review");
    return res.redirect(`/listings/${id}`);
  }
  next();
}

module.exports.validateBooking = (req,res,next) => {
  // The listing id is the one thing that tells us which page to go back to, and
  // it is only usable if it is actually an id.
  const listingId = req.body && req.body.booking && req.body.booking.listing;
  const backUrl = /^[a-f\d]{24}$/i.test(listingId) ? `/listings/${listingId}` : "/listings";
  if(rejectInvalid(req,res,bookingSchema,backUrl)){
    return;
  }
  next();
}

// Only the owner of the rented-out listing may approve or reject a request.
module.exports.isBookingOwner = async(req,res,next) =>{
  let {bookingId} = req.params;
  let booking = await Booking.findById(bookingId).populate("listing");
  if(!booking || !booking.listing || !booking.listing.owner){
    req.flash("error","That booking request no longer exists");
    return res.redirect("/bookings/requests");
  }
  if(!booking.listing.owner.equals(res.locals.currUser._id)){
    req.flash("error","You don't have permission to manage this booking");
    return res.redirect("/bookings/requests");
  }
  res.locals.booking = booking;
  next();
}

// Only the person who made the request may cancel it.
module.exports.isBookingUser = async(req,res,next) =>{
  let {bookingId} = req.params;
  let booking = await Booking.findById(bookingId);
  if(!booking){
    req.flash("error","That booking no longer exists");
    return res.redirect("/bookings");
  }
  if(!booking.user.equals(res.locals.currUser._id)){
    req.flash("error","You don't have permission to cancel this booking");
    return res.redirect("/bookings");
  }
  res.locals.booking = booking;
  next();
}