import { ClipboardItem, ClipboardType } from './types';

// Mock data generator for initial state
export const INITIAL_MOCK_DATA: ClipboardItem[] = [
  {
    id: '1',
    type: ClipboardType.Text,
    content: 'Hello, this is a plain text clipboard item.',
    timestamp: Date.now(),
    isStarred: false,
    metadata: { appName: 'Notes' }
  },
  {
    id: '2',
    type: ClipboardType.RTF,
    content: '<div style="color: red;"><b>Important Meeting</b><br><span>Discussion about Q4 Roadmap</span></div>',
    previewText: 'Important Meeting Discussion about Q4 Roadmap',
    timestamp: Date.now() - 100000,
    isStarred: true,
    metadata: { appName: 'Mail' }
  },
  {
    id: '3',
    type: ClipboardType.Image,
    content: 'https://picsum.photos/400/300',
    timestamp: Date.now() - 200000,
    isStarred: false,
    metadata: { appName: 'Photoshop', dimensions: '400x300' }
  },
  {
    id: '4',
    type: ClipboardType.Text,
    content: 'git commit -m "feat: initial clipboard ui"',
    timestamp: Date.now() - 300000,
    isStarred: false,
    metadata: { appName: 'iTerm2' }
  },
  {
    id: '5',
    type: ClipboardType.File,
    content: '/Users/admin/Documents/report.pdf',
    timestamp: Date.now() - 400000,
    isStarred: false,
    metadata: { appName: 'Finder', size: '2.4 MB' }
  },
  {
    id: '6',
    type: ClipboardType.Image,
    content: 'https://picsum.photos/400/400',
    timestamp: Date.now() - 500000,
    isStarred: true,
    metadata: { appName: 'Chrome', dimensions: '400x400' }
  },
  {
    id: '7',
    type: ClipboardType.Text,
    content: 'const [state, setState] = useState(null);',
    timestamp: Date.now() - 600000,
    isStarred: false,
    metadata: { appName: 'VS Code' }
  },
  {
    id: '8',
    type: ClipboardType.RTF,
    content: '<h1>Project Alpha</h1><p>Status: <strong>Green</strong></p>',
    previewText: 'Project Alpha Status: Green',
    timestamp: Date.now() - 700000,
    isStarred: false,
    metadata: { appName: 'Notion' }
  }
];

export const STORAGE_KEY = 'macos-clipboard-history';
