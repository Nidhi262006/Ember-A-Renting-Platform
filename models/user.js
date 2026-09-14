const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email:{
        type: String,
        required: true
    },
    // The signup form posts this and controllers/user.js hands it to the model,
    // but without a path here Mongoose dropped it, leaving every owner and
    // reviewer nameless in the views. Deliberately not required, so accounts
    // created before this existed still save.
    username:{
        type: String,
        trim: true
    }
});

userSchema.plugin(passportLocalMongoose,{usernameField: "email"});
module.exports = mongoose.model("User",userSchema); 