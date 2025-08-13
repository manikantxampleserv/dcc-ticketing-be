export const formatUserAvatar = (user: any) => {
  if (!user) return null;
  if (user.avatar) {
    return {
      ...user,
      avatar: `${process.env.BACKBLAZE_BUCKET_URL}/${user.avatar}`,
    };
  }
  return user;
};

export const formatUserListAvatars = (users: any[]) => {
  return users.map(formatUserAvatar);
};
