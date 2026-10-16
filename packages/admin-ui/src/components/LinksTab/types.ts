export interface TrackableLink {
  id: number;
  entry_id: number;
  name: string;
  url_params: string;
  created_at: string;
}

export interface LinksTabProps {
  entryId: string | undefined;
  baseCanonicalUrl: string;
  isSaved: boolean;
}

export interface CreateLinkFormValues {
  name: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  customParams: string;
}

export interface CanonicalUrlCardProps {
  absoluteCanonicalUrl: string;
  copiedLink: string | null;
  onCopy: (url: string) => void;
}

export interface CreateLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; url_params: string }) => void | Promise<void>;
  isSubmitting: boolean;
}

export interface TrackableLinksTableProps {
  links: TrackableLink[];
  isLoading: boolean;
  copiedLink: string | null;
  onCopy: (url: string) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  constructFullUrl: (paramsString: string) => string;
}
