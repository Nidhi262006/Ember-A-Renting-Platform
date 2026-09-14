// Renders a date as e.g. "5 Sep 2026".
// Booking dates come from <input type="date">, which Date parses as UTC
// midnight, so they are formatted in UTC to stop the day shifting for
// viewers in other time zones.
module.exports = (date) => {
    if(!date){
        return "";
    }
    return new Date(date).toLocaleDateString("en-IN",{
        day:"numeric",
        month:"short",
        year:"numeric",
        timeZone:"UTC",
    });
}
