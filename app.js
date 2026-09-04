if(process.env.NODE_ENV!="production"){
require('dotenv').config();
}

const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const formatDate = require("./utils/formatDate");

const listingRouter = require("./Routes/listing");
const reviewRouter = require("./Routes/review");
const userRouter = require("./Routes/user");
const bookingRouter = require("./Routes/booking");

mongoose.connect("mongodb://127.0.0.1:27017/majorproject")
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOptions = {
  secret: "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
      expires: Date.now()+7*24*60*60*1000,
      maxAge: 7*24*60*60*1000,
      httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.formatDate = formatDate;
  next();
});

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/bookings",bookingRouter);
app.use("/",userRouter);

app.use((err,req,res,next) => {
  let {statusCode = 500, message = "Something went wrong!"} = err;
  res.status(statusCode).render("error.ejs",{message});
});

app.use((req,res) => {
  res.status(404).send("Page not found!");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});