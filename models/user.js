
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    fullName: {
        type: String,
        trim: true,
        default: ""
    },

    phone: {
        type: String,
        trim: true,
        default: ""
    }
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

module.exports = mongoose.model("User", userSchema);

