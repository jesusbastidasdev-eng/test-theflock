export type UserPublic = {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type Tweet = {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author: UserPublic;
  likeCount: number;
  likedByMe: boolean;
};

export type MeResponse = { user: UserPublic };
