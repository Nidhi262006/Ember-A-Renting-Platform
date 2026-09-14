const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");

const {
    saveRedirectUrl,
    isLoggedIn
} = require("../middleware.js");

const userController = require("../controllers/user.js");

router.route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

router.route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true,
        }),
        userController.login
    );

// PROFILE
router.get(
    "/profile",
    isLoggedIn,
    wrapAsync(userController.renderProfile)
);

router.get(
    "/profile/edit",
    isLoggedIn,
    wrapAsync(userController.renderEditProfile)
);

router.put(
    "/profile",
    isLoggedIn,
    wrapAsync(userController.updateProfile)
);

// LOGOUT
router.post(
    "/logout",
    userController.logout
);

module.exports = router;