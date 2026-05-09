export type PhotoCategory = 'All' | 'Fitness' | 'Nutrition' | 'Dance' | 'Progress' | 'Community';

export interface PhotoGalleryPost {
  id?: string;
  content?: string;
  mediaUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  title: string;
  likes: number;
  comments: number;
  createdAt?: string;
  category: PhotoCategory;
}

export interface PhotoGalleryCardProps {
  photo: PhotoItem;
  index: number;
  onOpen: (photo: PhotoItem) => void;
  onShare: (photoUrl: string) => Promise<void>;
}
