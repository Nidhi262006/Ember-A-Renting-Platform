class ExpressError extends Error {
    constructor(statusCode,message){
        // Passing it up to Error keeps the message on err.stack, so a logged
        // trace says what went wrong instead of starting with a bare "Error".
        super(message);
        this.name = "ExpressError";
        this.statusCode = statusCode;
        this.message = message;
    }
}

module.exports = ExpressError;