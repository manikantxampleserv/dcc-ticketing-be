"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = paginate;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function paginate(_a) {
    return __awaiter(this, arguments, void 0, function* ({ model, filters = {}, page = 1, limit = 10, select, include, orderBy = { id: "desc" }, }) {
        const skip = (page - 1) * limit;
        const total_count = yield model.count({ where: filters });
        const data = yield model.findMany({
            where: filters,
            skip,
            take: limit,
            select,
            include,
            orderBy,
        });
        return {
            data,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total_count / limit),
                total_count,
                has_next: page * limit < total_count,
                has_previous: page > 1,
            },
        };
    });
}
