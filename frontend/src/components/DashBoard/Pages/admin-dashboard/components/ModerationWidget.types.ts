export type ModerationAction = 'approve' | 'reject' | 'delete';

export type ModerationStats = {
  pending: number;
  approved: number;
  flagged: number;
  rejected: number;
};

export type ModerationAuthor = {
  firstName?: string;
  lastName?: string;
};

export type ModerationPost = {
  id?: string | number;
  _id?: string | number;
  content?: string;
  user?: ModerationAuthor;
  author?: ModerationAuthor;
};
