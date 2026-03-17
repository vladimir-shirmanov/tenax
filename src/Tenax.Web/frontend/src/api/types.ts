export type ValidationErrors = Record<string, string[]>;

export type ApiErrorEnvelope = {
  code: string;
  message: string;
  traceId?: string;
  errors?: ValidationErrors;
};

export type FlashcardListItem = {
  id: string;
  deckId: string;
  term: string;
  definitionPreview: string;
  hasImage: boolean;
  updatedAtUtc: string;
  updatedByUserId: string | null;
};

export type FlashcardListResponse = {
  items: FlashcardListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type FlashcardDetail = {
  id: string;
  deckId: string;
  term: string;
  definition: string;
  imageUrl: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type FlashcardWriteRequest = {
  term: string;
  definition: string;
  imageUrl: string | null;
};

export type FlashcardDeleteResponse = {
  deleted: boolean;
  id: string;
  deckId: string;
  deletedAtUtc: string;
};

export type DeckListItem = {
  id: string;
  name: string;
  description: string | null;
  flashcardCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type DeckListResponse = {
  items: DeckListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type DeckDetail = {
  id: string;
  name: string;
  description: string | null;
  flashcardCount?: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type DeckWriteRequest = {
  name: string;
  description: string | null;
};

export type DeckDeleteResponse = {
  deleted: boolean;
  id: string;
  deletedAtUtc: string;
};

export type AuthSessionUser = {
  subject: string;
  displayName: string;
  email: string | null;
};

export type AuthMenuLink = {
  key: string;
  label: string;
  href: string;
};

export type AuthSessionResponse = {
  isAuthenticated: boolean;
  user: AuthSessionUser | null;
  menu: {
    visible: boolean;
    links: AuthMenuLink[];
  };
};
