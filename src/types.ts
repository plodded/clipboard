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
    dimensions?: string; // For images (display format: "WxH")
    size?: string; // For files (display format: "N 个文件")
    width?: number; // Image width in pixels
    height?: number; // Image height in pixels
    fileCount?: number; // Number of files
  };
}

export enum FilterCategory {
  All = 'All',
  Text = 'Text',
  Image = 'Image',
  File = 'File',
  Starred = 'Starred'
}
