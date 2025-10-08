"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketNumber = generateTicketNumber;
function generateTicketNumber(ticketId) {
    if (ticketId <= 999) {
        // Pad with zeros for 1-999 (3 digits)
        return `TCKT-${ticketId.toString().padStart(3, "0")}`;
    }
    else {
        // No padding for 1000 and above
        return `TCKT-${ticketId}`;
    }
}
