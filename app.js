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
const ExpressError = require("./utils/ExpressError");
const normalizeError = require("./utils/normalizeError");

const listingRouter = require("./Routes/listing");
const reviewRouter = require("./Routes/review");
const userRouter = require("./Routes/user");
const bookingRouter = require("./Routes/booking");

const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;
const dbUrl = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/majorproject";
const sessionSecret = process.env.SESSION_SECRET || "mysupersecretcode";

// A missing config value is far cheaper to spot here than to debug from a 500
// three screens into the app.
if(isProduction && !process.env.SESSION_SECRET){
  console.warn("[config] SESSION_SECRET is not set, so the fallback in app.js is being used. Set it before deploying.");
}
if(!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET){
  console.warn("[config] Cloudinary credentials are missing (CLOUD_NAME / CLOUD_API_KEY / CLOUD_API_SECRET). Image uploads will fail until they are set — see .env.example.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOptions = {
  secret: sessionSecret,
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
// The User model registers passport-local-mongoose with usernameField:"email",
// so the strategy has to read the same field or the login form's value never
// reaches it and every attempt fails with "Missing credentials".
passport.use(new LocalStrategy({usernameField: "email"},User.authenticate()));

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

// Nothing matched. Handing it to the error handler below rather than answering
// here means a 404 gets the same styled page as every other failure, instead of
// a bare line of text with no way back.
app.use((req,res,next) => {
  next(new ExpressError(404,"We couldn't find that page. It may have been moved, or the link may be wrong."));
});

app.use((err,req,res,next) => {
  const {statusCode, message} = normalizeError(err);

  // The visitor only ever reads `message`. The real error goes to the log, so a
  // 500 leaves a trace for whoever has to fix it.
  if(statusCode >= 500){
    console.error(`[${statusCode}] ${req.method} ${req.originalUrl}`);
    console.error(err && err.stack ? err.stack : err);
  }else{
    console.warn(`[${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
  }

  // The error page renders through layouts/boilerplate, which reads all four of
  // these. An error thrown before the locals middleware above would leave them
  // undefined and the error page itself would then throw.
  res.locals.success = res.locals.success || [];
  res.locals.error = res.locals.error || [];
  res.locals.currUser = res.locals.currUser || null;
  res.locals.formatDate = res.locals.formatDate || formatDate;

  // Given a callback, res.render hands back the HTML instead of sending it, so a
  // failure in the template can be caught here rather than escaping to Express
  // and becoming a stack trace in the browser.
  res.status(statusCode).render("error",{
    statusCode,
    message,
    stack: isProduction ? null : (err && err.stack) || "",
  },(renderErr,html) => {
    if(renderErr){
      console.error("The error page itself failed to render:",renderErr.message);
      return res.type("text").send(`${statusCode} — ${message}`);
    }
    res.send(html);
  });
});

mongoose.connection.on("error",(err) => {
  console.error("[db] connection error:",err.message);
});

mongoose.connection.on("disconnected",() => {
  console.warn("[db] disconnected — requests will keep failing until the connection is back.");
});

// Listening before the database has answered only means every page waits ten
// seconds and then fails, so wait for the connection and give up if it never
// arrives.
mongoose.connect(dbUrl)
  .then(() => {
    console.log("DB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`[db] could not connect to ${dbUrl}`);
    console.error(`[db] ${err.message}`);
    console.error("[db] Is MongoDB running? Point MONGO_URI at another server in .env if it lives elsewhere.");
    process.exit(1);
  });

process.on("unhandledRejection",(reason) => {
  console.error("Unhandled promise rejection:",reason);
});

process.on("uncaughtException",(err) => {
  console.error("Uncaught exception — shutting down:",err);
  process.exit(1);
});