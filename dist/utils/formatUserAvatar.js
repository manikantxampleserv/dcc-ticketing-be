"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatUserListAvatars = exports.formatUserAvatar = void 0;
const formatUserAvatar = (user) => {
    if (!user)
        return null;
    if (user.avatar) {
        return Object.assign(Object.assign({}, user), { avatar: `${process.env.BACKBLAZE_BUCKET_URL}/${user.avatar}` });
    }
    return user;
};
exports.formatUserAvatar = formatUserAvatar;
const formatUserListAvatars = (users) => {
    return users.map(exports.formatUserAvatar);
};
exports.formatUserListAvatars = formatUserListAvatars;
