"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseHandler = void 0;
const responseHandler = (req, res, next) => {
    res.success = function (message, data = null, statusCode = 200, pagination) {
        const response = {
            success: true,
            message,
        };
        if (data !== null)
            response.data = data;
        if (pagination)
            response.pagination = pagination;
        return this.status(statusCode).json(response);
    };
    res.error = function (error, statusCode = 500) {
        return this.status(statusCode).json({
            success: false,
            error,
        });
    };
    next();
};
exports.responseHandler = responseHandler;
