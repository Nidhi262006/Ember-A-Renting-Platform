
const User = require("../models/user");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { email, password } = req.body;

        const newUser = new User({
            email
        });

        const registeredUser = await User.register(newUser, password);

        console.log(registeredUser);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }

            req.flash("success", "Welcome to Ember!");
            res.redirect("/listings");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to Ember!");

    let redirectUrl = res.locals.redirectUrl || "/listings";

    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "You are successfully logged out!");
        res.redirect("/listings");
    });
};


// ==========================================
// VIEW PROFILE
// ==========================================

module.exports.renderProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "User profile not found.");
        return res.redirect("/listings");
    }

    res.render("users/profile.ejs", { user });
};


// ==========================================
// EDIT PROFILE FORM
// ==========================================

module.exports.renderEditProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "User profile not found.");
        return res.redirect("/listings");
    }

    res.render("users/edit-profile.ejs", { user });
};


// ==========================================
// UPDATE PROFILE
// ==========================================

module.exports.updateProfile = async (req, res) => {
    const { fullName, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "User profile not found.");
        return res.redirect("/listings");
    }

    user.fullName = fullName ? fullName.trim() : "";
    user.phone = phone ? phone.trim() : "";

    await user.save();

    req.flash("success", "Profile updated successfully!");

    res.redirect("/profile");
};

