// Joi's own messages read like `"listing.price" is required` — fine in a log, no
// use to somebody filling in a form. This turns the details into plain sentences.

const LABELS = {
    title: "Title",
    description: "Description",
    price: "Price per day",
    location: "Location",
    country: "Country",
    category: "Category",
    image: "Photo",
    rating: "Rating",
    comment: "Review",
    listing: "Listing",
    startDate: "Start date",
    endDate: "Return date",
};

// The top-level key each form nests its fields under. A complaint about one of
// these means the whole submission arrived empty, not that a field is wrong.
const WRAPPERS = new Set(["listing", "review", "booking"]);

const EMPTY_FORM = "Please fill in the form before submitting";

module.exports = (error) => {
    if (!error || !Array.isArray(error.details) || !error.details.length) {
        return "Please check the details you entered and try again.";
    }

    const messages = [];

    for (const detail of error.details) {
        const path = detail.path || [];
        const key = path[path.length - 1];

        if (!path.length || (path.length === 1 && WRAPPERS.has(key))) {
            messages.push(EMPTY_FORM);
            continue;
        }

        const name = LABELS[key] || key;
        const limit = detail.context && detail.context.limit;

        switch (detail.type) {
            case "any.required":
            case "string.empty":
            case "array.min":
                messages.push(`${name} is required`);
                break;
            case "number.base":
                messages.push(`${name} must be a number`);
                break;
            case "number.min":
                messages.push(`${name} must be at least ${limit}`);
                break;
            case "number.max":
                messages.push(`${name} can't be more than ${limit}`);
                break;
            case "number.positive":
                messages.push(`${name} must be greater than zero`);
                break;
            case "number.integer":
                messages.push(`${name} must be a whole number`);
                break;
            case "string.min":
                messages.push(`${name} must be at least ${limit} characters`);
                break;
            case "string.max":
                messages.push(`${name} can't be longer than ${limit} characters`);
                break;
            case "string.email":
                messages.push(`${name} must be a valid email address`);
                break;
            case "date.base":
                messages.push(`${name} must be a valid date`);
                break;
            case "date.greater":
                messages.push(`${name} must be later than the start date`);
                break;
            case "any.only":
                messages.push(`${name} isn't one of the options we offer`);
                break;
            case "object.unknown":
                messages.push(`We didn't recognise "${key}"`);
                break;
            case "object.base":
                messages.push(EMPTY_FORM);
                break;
            default:
                messages.push(`${name} is not valid`);
        }
    }

    // One field can trip more than one rule, so say each thing only once.
    return `${[...new Set(messages)].join(". ")}.`;
};
