const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const ExpressError = require("./utils/ExpressError.js");
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
  if(!listing.owner.equals(res.locals.currUser._id)){
    req.flash("error","You don't have permission to edit");
    return res.redirect(`/listings/${req.params.id}`);
  }
}

module.exports.validateListing = (req,res,next) => {
  let {error} = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400,errMsg);
  }else{
    next();
  }
}

module.exports.validateReview = (req,res,next) => {
  let {error} = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400,errMsg);
  }else{
    next();
  }
}

module.exports.isReviewAuthor = async(req,res,next) =>{
  let{id,reviewId} = req.params;
  let review = await Review.findById(reviewId);
  if(!review.author.equals(res.locals.currUser._id)){
    req.flash("error","You didn't create this review");
    return res.redirect(`/listings/${req.params.id}`);
  }
}

module.exports.validateBooking = (req,res,next) => {
  let {error} = bookingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400,errMsg);
  }else{
    next();
  }
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