export interface StagedDiffModalProps {
  open: boolean;
  title: string;
  description?: string;
  fieldLabel: string;
  beforeText: string;
  afterText: string;
  onAccept: () => void;
  onReject: () => void;
}

export interface DiffPaneProps {
  title: string;
  badgeLabel: string;
  badgeColor?: 'gray' | 'cyan';
  text: string;
  isModified?: boolean;
}
