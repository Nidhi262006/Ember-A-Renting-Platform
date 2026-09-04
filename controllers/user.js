const User = require("../models/user");

module.exports.renderSignupForm =  (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
        try {
            let { username, email, password } = req.body;
            const newUser = new User({ email, username });
            const registeredUser = await User.register(newUser, password);
            req.login(registeredUser,(err)=>{
                if(err){
                    return next(err);
                }
                 req.flash("success", "Welcome to Ourpage");
                 res.redirect("/listings");
            });
        } catch (e) {
            req.flash("error", e.message);
            res.redirect("/signup");
        }
    };

module.exports.renderLoginForm = (req,res) => {
    res.render("users/login.ejs");
};

module.exports.login = async(req,res) => {
        req.flash("success", "Welcome to Ourpage");
        // saveRedirectUrl copied this over from the session before passport ran.
        const redirectUrl = res.locals.redirectUrl || "/listings";
        // Good for one trip only, or the next login jumps to a stale page.
        delete req.session.redirectUrl;
        res.redirect(redirectUrl);
};

module.exports.logout = (req,res,next) =>{
    req.logout((err) => {
        if(err){
            return next(err);
        }
         req.flash("success", "You are successfully logged out!");
        res.redirect("/listings");
    })
};