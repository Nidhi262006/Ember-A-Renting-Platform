const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const{isLoggedIn,validateBooking,isBookingOwner,isBookingUser} = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

router.route("/")
.get(isLoggedIn, wrapAsync(bookingController.myBookings))
.post(isLoggedIn, validateBooking, wrapAsync(bookingController.createBooking));

// Requests other people have made on the current user's own listings
router.get("/requests", isLoggedIn, wrapAsync(bookingController.bookingRequests));

// Owner decisions
router.post("/:bookingId/approve", isLoggedIn, isBookingOwner, wrapAsync(bookingController.approveBooking));
router.post("/:bookingId/reject", isLoggedIn, isBookingOwner, wrapAsync(bookingController.rejectBooking));

// Renter backing out of their own booking
router.post("/:bookingId/cancel", isLoggedIn, isBookingUser, wrapAsync(bookingController.cancelBooking));

module.exports = router;
