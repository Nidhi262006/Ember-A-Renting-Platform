const ExpressError = require("./ExpressError");

// The wording a visitor is allowed to read for a given status code. Anything we
// don't recognise falls through to 500, and a 500 never repeats the raw error
// message — that goes to the server log instead, where it belongs.
const GENERIC = {
    400: "We couldn't understand that request. Please check the details and try again.",
    401: "Please log in to continue.",
    403: "You don't have permission to do that.",
    404: "We couldn't find that page. It may have been moved, or the link may be wrong.",
    409: "That conflicts with something that already exists.",
    413: "That was too large for us to accept.",
    500: "Something went wrong on our end. We've logged it — please try again in a moment.",
    503: "We're having trouble reaching our database. Please try again in a moment.",
};

// Field names as a person would say them, not as the schema spells them.
const FIELD_LABELS = {
    title: "Title",
    description: "Description",
    price: "Price per day",
    location: "Location",
    country: "Country",
    category: "Category",
    image: "Photo",
    email: "Email",
    username: "Username",
    rating: "Rating",
    comment: "Review",
    startDate: "Start date",
    endDate: "Return date",
};

const label = (field) => FIELD_LABELS[field] || field;

// A failed `mongoose` document validation, e.g. a category outside the enum.
const fromMongooseValidation = (err) => {
    return Object.values(err.errors)
        .map((detail) => {
            const name = label(detail.path);
            if (detail.kind === "required") {
                return `${name} is required`;
            }
            if (detail.kind === "enum") {
                return `"${detail.value}" isn't one of the ${name.toLowerCase()} options we offer`;
            }
            if (detail.kind === "Number" || detail.name === "CastError") {
                return `${name} must be a number`;
            }
            if (detail.kind === "min" || detail.kind === "max") {
                return `${name} is out of range`;
            }
            return `${name} is not valid`;
        })
        .join(". ");
};

// A unique-index collision. `keyValue` tells us which field clashed.
const fromDuplicateKey = (err) => {
    const field = Object.keys(err.keyValue || {})[0];
    if (!field) {
        return "That already exists. Please try something else.";
    }
    return `${label(field)} is already taken. Please use a different one.`;
};

const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: {
        statusCode: 413,
        message: "That image is too large. Please pick a smaller one.",
    },
    LIMIT_UNEXPECTED_FILE: {
        statusCode: 400,
        message: "We couldn't accept that file. Please upload a single PNG or JPG image.",
    },
    LIMIT_FILE_COUNT: {
        statusCode: 400,
        message: "Please upload one image at a time.",
    },
};

// The database being unreachable looks different depending on whether it went
// away before or during a query, so check the several shapes it arrives in.
const DB_OUTAGE_NAMES = [
    "MongoNetworkError",
    "MongoServerSelectionError",
    "MongooseServerSelectionError",
    "MongoNotConnectedError",
    "MongoTimeoutError",
];

const looksLikeDbOutage = (err) => {
    if (DB_OUTAGE_NAMES.includes(err.name)) {
        return true;
    }
    return typeof err.message === "string" && err.message.includes("buffering timed out");
};

// Turns anything thrown anywhere in the app into a status code plus a sentence
// that is safe and useful to show a visitor. This is the only place that decides
// what a failure is allowed to say.
module.exports = (err) => {
    if (!err || typeof err !== "object") {
        return { statusCode: 500, message: GENERIC[500] };
    }

    // Raised deliberately by our own code, so the wording is already ours.
    if (err instanceof ExpressError) {
        const statusCode = err.statusCode || 500;
        return {
            statusCode,
            message: err.message || GENERIC[statusCode] || GENERIC[500],
        };
    }

    // A malformed id in the URL, e.g. /listings/not-a-real-id.
    if (err.name === "CastError") {
        return {
            statusCode: 404,
            message: "We couldn't find that item — the link may be broken, or it may have been removed.",
        };
    }

    if (err.name === "ValidationError" && err.errors) {
        return {
            statusCode: 400,
            message: fromMongooseValidation(err) || GENERIC[400],
        };
    }

    if (err.code === 11000) {
        return { statusCode: 409, message: fromDuplicateKey(err) };
    }

    if (err.name === "MulterError") {
        return (
            MULTER_MESSAGES[err.code] || {
                statusCode: 400,
                message: "We couldn't upload that image. Please try another file.",
            }
        );
    }

    // Raised by express.urlencoded when a request body is malformed or oversized.
    if (err.type === "entity.parse.failed") {
        return { statusCode: 400, message: "We couldn't read that submission. Please try again." };
    }
    if (err.type === "entity.too.large") {
        return { statusCode: 413, message: "That submission was too large. Please shorten it and try again." };
    }

    if (looksLikeDbOutage(err)) {
        return { statusCode: 503, message: GENERIC[503] };
    }

    // A status set by a library rather than by us. Trust the code, not the text.
    const status = err.statusCode || err.status;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
        return { statusCode: status, message: GENERIC[status] || GENERIC[400] };
    }

    return { statusCode: 500, message: GENERIC[500] };
};
