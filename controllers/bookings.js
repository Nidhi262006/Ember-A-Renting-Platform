const Listing = require("../models/listing");
const Booking = require("../models/booking");
const formatDate = require("../utils/formatDate");

// A booking only holds the dates while it is pending or approved.
// Rejecting or cancelling frees those dates up again.
const ACTIVE_STATUSES = ["pending", "approved"];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// <input type="date"> posts a bare calendar date, which Date parses as UTC
// midnight, so "today" is normalised the same way before the two are compared.
const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const countDays = (startDate, endDate) => {
  return Math.max(1, Math.round((endDate - startDate) / MS_PER_DAY));
};

// Two date ranges clash when each one starts on or before the other one ends.
const findClashingBooking = (listingId, startDate, endDate, statuses, excludeId) => {
  const query = {
    listing: listingId,
    status: { $in: statuses },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return Booking.findOne(query);
};

module.exports.createBooking = async (req, res) => {
  const { listing: listingId, startDate, endDate } = req.body.booking;
  const listing = await Listing.findById(listingId);

  if (!listing) {
    req.flash("error", "The listing you tried to book does not exist");
    return res.redirect("/listings");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const listingUrl = `/listings/${listing._id}`;

  if (listing.owner && listing.owner.equals(req.user._id)) {
    req.flash("error", "You can't book your own listing");
    return res.redirect(listingUrl);
  }

  if (!listing.isAvailable) {
    req.flash("error", "This item has been marked unavailable by its owner");
    return res.redirect(listingUrl);
  }

  if (start < startOfToday()) {
    req.flash("error", "The start date can't be in the past");
    return res.redirect(listingUrl);
  }

  if (end <= start) {
    req.flash("error", "The return date must be after the start date");
    return res.redirect(listingUrl);
  }

  const clash = await findClashingBooking(listing._id, start, end, ACTIVE_STATUSES);
  if (clash) {
    req.flash(
      "error",
      `This item is already taken from ${formatDate(clash.startDate)} to ${formatDate(clash.endDate)}. Please pick other dates.`
    );
    return res.redirect(listingUrl);
  }

  const days = countDays(start, end);
  const booking = new Booking({
    listing: listing._id,
    user: req.user._id,
    startDate: start,
    endDate: end,
    days,
    totalPrice: days * listing.price,
  });
  await booking.save();

  req.flash("success", "Booking requested! The owner will confirm it shortly.");
  res.redirect("/bookings");
};

module.exports.myBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });
  res.render("bookings/index", { bookings });
};

module.exports.bookingRequests = async (req, res) => {
  const myListings = await Listing.find({ owner: req.user._id }).select("_id");
  const bookings = await Booking.find({
    listing: { $in: myListings.map((listing) => listing._id) },
  })
    .populate("listing")
    .populate("user")
    .sort({ createdAt: -1 });
  res.render("bookings/requests", { bookings });
};

module.exports.approveBooking = async (req, res) => {
  // isBookingOwner already loaded the booking with its listing populated.
  const booking = res.locals.booking;

  if (booking.status !== "pending") {
    req.flash("error", `This request has already been ${booking.status}`);
    return res.redirect("/bookings/requests");
  }

  // Re-check here as well: another request for the same dates may have been
  // approved since this one came in.
  const clash = await findClashingBooking(
    booking.listing._id,
    booking.startDate,
    booking.endDate,
    ["approved"],
    booking._id
  );
  if (clash) {
    req.flash("error", "Those dates are already approved for another renter");
    return res.redirect("/bookings/requests");
  }

  booking.status = "approved";
  await booking.save();

  // Any other pending request overlapping these dates can no longer be honoured.
  await Booking.updateMany(
    {
      _id: { $ne: booking._id },
      listing: booking.listing._id,
      status: "pending",
      startDate: { $lte: booking.endDate },
      endDate: { $gte: booking.startDate },
    },
    { status: "rejected" }
  );

  req.flash("success", "Booking approved!");
  res.redirect("/bookings/requests");
};

module.exports.rejectBooking = async (req, res) => {
  const booking = res.locals.booking;

  if (booking.status !== "pending") {
    req.flash("error", `This request has already been ${booking.status}`);
    return res.redirect("/bookings/requests");
  }

  booking.status = "rejected";
  await booking.save();

  req.flash("success", "Booking request rejected.");
  res.redirect("/bookings/requests");
};

module.exports.cancelBooking = async (req, res) => {
  const booking = res.locals.booking;

  if (!ACTIVE_STATUSES.includes(booking.status)) {
    req.flash("error", `This booking is already ${booking.status}`);
    return res.redirect("/bookings");
  }

  booking.status = "cancelled";
  await booking.save();

  req.flash("success", "Booking cancelled.");
  res.redirect("/bookings");
};
