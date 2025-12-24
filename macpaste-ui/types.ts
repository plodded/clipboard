export enum ClipboardType {
  Text = 'Text',
  RTF = 'RTF',
  Image = 'Image',
  File = 'File'
}

export interface ClipboardItem {
  id: string;
  type: ClipboardType;
  content: string; // Text content or Image URL or File path
  previewText?: string; // For RTF stripped text
  timestamp: number;
  isStarred: boolean;
  metadata?: {
    appName?: string;
    dimensions?: string; // For images
    size?: string; // For files
  };
}

export enum FilterCategory {
  All = 'All',
  Text = 'Text',
  Image = 'Image',
  File = 'File',
  Starred = 'Starred'
}
