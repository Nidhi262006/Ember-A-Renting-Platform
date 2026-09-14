const Joi = require("joi");

module.exports.listingSchema = Joi.object ({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().required(),
        location: Joi.string().required(),
        country: Joi.string().allow("",null),
        category: Joi.string().allow("",null),
        image: Joi.string().allow("",null)
    }).required()
});

module.exports.reviewSchema = Joi.object ({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required()
});

module.exports.bookingSchema = Joi.object ({
    booking: Joi.object({
        listing: Joi.string().hex().length(24).required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
    }).required()
});
