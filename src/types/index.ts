export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams {
  query?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  }
}