import { FileSystemTree } from '@webcontainer/api';
import type { FileNode } from '@/types';

/**
 * FileNode 배열을 WebContainer FileSystemTree로 변환
 */
export function fileNodesToFileSystemTree(nodes: FileNode[]): FileSystemTree {
  const result: FileSystemTree = {};

  for (const node of nodes) {
    if (node.type === 'directory') {
      result[node.name] = {
        directory: node.children
          ? fileNodesToFileSystemTree(node.children)
          : {}
      };
    } else {
      result[node.name] = {
        file: {
          contents: node.content || ''
        }
      };
    }
  }

  return result;
}

/**
 * 단일 파일 경로와 내용을 FileSystemTree로 변환
 */
export function fileToFileSystemTree(path: string, content: string): FileSystemTree {
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 1) {
    return {
      [parts[0]]: {
        file: { contents: content }
      }
    };
  }

  let result: FileSystemTree = {
    [parts[parts.length - 1]]: {
      file: { contents: content }
    }
  };

  for (let i = parts.length - 2; i >= 0; i--) {
    result = {
      [parts[i]]: {
        directory: result
      }
    };
  }

  return result;
}

// =============================================================================
// Vite + React 기본 프로젝트 템플릿
// =============================================================================
export const defaultProjectFiles: FileSystemTree = {
  'package.json': {
    file: {
      contents: `{
  "name": "vibric-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}`
    }
  },
  'vite.config.js': {
    file: {
      contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vibric Ready Signal Plugin - CSS 로드 완료 감지
function vibricPlugin() {
  return {
    name: 'vibric-ready',
    transformIndexHtml(html) {
      const vibricScript = \`
<script>
(function() {
  let selectionModeEnabled = true;
  
  // CSS 로드 완료 감지 및 신호 전송
  function checkCssReady() {
    const styles = document.styleSheets;
    const hasStyles = styles.length > 0;
    const bodyComputed = window.getComputedStyle(document.body);
    const hasBackground = bodyComputed.backgroundColor !== 'rgba(0, 0, 0, 0)';
    
    if (hasStyles || hasBackground) {
      window.parent.postMessage({ type: 'vibric-css-ready' }, '*');
      return true;
    }
    return false;
  }
  
  // DOM 로드 후 CSS 체크 (폴링)
  function waitForCss() {
    if (!checkCssReady()) {
      setTimeout(waitForCss, 100);
    }
  }
  
  // 선택 모드 메시지 수신
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'vibric-selection-mode') {
      selectionModeEnabled = e.data.enabled;
      document.body.style.cursor = selectionModeEnabled ? 'crosshair' : '';
    }
  });
  
  // CSS 셀렉터 생성
  function getSelector(el) {
    if (el.dataset && el.dataset.vibricId) return '[data-vibric-id="' + el.dataset.vibricId + '"]';
    if (el.id) return '#' + el.id;
    let path = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\\\\s+/).filter(c => c).slice(0, 2);
        if (classes.length) selector += '.' + classes.join('.');
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }
  
  // 요소 정보 전송
  function sendElementInfo(type, el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    
    const rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: type,
      data: {
        selector: getSelector(el),
        tagName: el.tagName,
        className: el.className || '',
        textContent: (el.textContent || '').slice(0, 100),
        rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }
    }, '*');
  }
  
  let hoveredElement = null;
  
  document.addEventListener('mouseover', function(e) {
    if (!selectionModeEnabled) return;
    if (hoveredElement !== e.target) {
      hoveredElement = e.target;
      sendElementInfo('element-hover', e.target);
    }
  }, true);
  
  document.addEventListener('mouseout', function(e) {
    if (!selectionModeEnabled) return;
    if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
      hoveredElement = null;
      window.parent.postMessage({ type: 'element-leave' }, '*');
    }
  }, true);
  
  document.addEventListener('click', function(e) {
    if (!selectionModeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    sendElementInfo('element-select', e.target);
  }, true);
  
  // 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCss);
  } else {
    waitForCss();
  }
  
  // 부모에게 준비 완료 알림
  window.parent.postMessage({ type: 'vibric-iframe-ready' }, '*');
})();
</script>\`;
      return html.replace('</head>', vibricScript + '</head>');
    }
  };
}

export default defineConfig({
  plugins: [react(), vibricPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  }
});`
    }
  },
  'index.html': {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibric React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
    }
  },
  'src': {
    directory: {
      'main.jsx': {
        file: {
          contents: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
        }
      },
      'App.jsx': {
        file: {
          contents: `import './App.css';

function App() {
  return (
    <div className="app">
      <header className="hero" data-vibric-id="hero">
        <h1>Welcome to Vibric</h1>
        <p>AI-Powered React Development</p>
      </header>

      <main className="cards">
        <div className="card" data-vibric-id="card-1">
          <h3>⚡ Fast</h3>
          <p>Powered by Vite for instant HMR</p>
        </div>
        <div className="card" data-vibric-id="card-2">
          <h3>🎨 Beautiful</h3>
          <p>AI-crafted modern designs</p>
        </div>
        <div className="card" data-vibric-id="card-3">
          <h3>🤖 Smart</h3>
          <p>AI assists your development</p>
        </div>
      </main>

      <button className="btn" data-vibric-id="cta-button">
        Get Started
      </button>
    </div>
  );
}

export default App;`
        }
      },
      'index.css': {
        file: {
          contents: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #09090b;
  color: white;
  min-height: 100vh;
}`
        }
      },
      'App.css': {
        file: {
          contents: `.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 1rem;
  margin-bottom: 2rem;
  text-align: center;
}

.hero h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.hero p {
  font-size: 1.125rem;
  opacity: 0.9;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  padding: 1.5rem;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  border-color: #3b82f6;
}

.card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card p {
  font-size: 0.875rem;
  color: #a1a1aa;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
}`
        }
      }
    }
  }
};

// =============================================================================
// 기본 파일 노드 생성 (FileSystemStore 초기화용) - Vite + React 구조
// =============================================================================
export const defaultFileNodes: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    isOpen: true,
    children: [
      {
        name: 'components',
        path: 'src/components',
        type: 'directory',
        isOpen: true,
        children: [],
      },
      {
        name: 'pages',
        path: 'src/pages',
        type: 'directory',
        isOpen: false,
        children: [],
      },
      {
        name: 'main.jsx',
        path: 'src/main.jsx',
        type: 'file',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      },
      {
        name: 'App.jsx',
        path: 'src/App.jsx',
        type: 'file',
        content: `import './App.css';

function App() {
  return (
    <div className="app">
      <header className="hero" data-vibric-id="hero">
        <h1>Welcome to Vibric</h1>
        <p>AI-Powered React Development</p>
      </header>

      <main className="cards">
        <div className="card" data-vibric-id="card-1">
          <h3>⚡ Fast</h3>
          <p>Powered by Vite for instant HMR</p>
        </div>
        <div className="card" data-vibric-id="card-2">
          <h3>🎨 Beautiful</h3>
          <p>AI-crafted modern designs</p>
        </div>
        <div className="card" data-vibric-id="card-3">
          <h3>🤖 Smart</h3>
          <p>AI assists your development</p>
        </div>
      </main>

      <button className="btn" data-vibric-id="cta-button">
        Get Started
      </button>
    </div>
  );
}

export default App;`
      },
      {
        name: 'index.css',
        path: 'src/index.css',
        type: 'file',
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #09090b;
  color: white;
  min-height: 100vh;
}`
      },
      {
        name: 'App.css',
        path: 'src/App.css',
        type: 'file',
        content: `.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 1rem;
  margin-bottom: 2rem;
  text-align: center;
}

.hero h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.hero p {
  font-size: 1.125rem;
  opacity: 0.9;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  padding: 1.5rem;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  border-color: #3b82f6;
}

.card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card p {
  font-size: 0.875rem;
  color: #a1a1aa;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
}`
      }
    ],
  },
  {
    name: 'index.html',
    path: 'index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibric React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    content: `{
  "name": "vibric-react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}`
  },
  {
    name: 'vite.config.js',
    path: 'vite.config.js',
    type: 'file',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vibric Ready Signal Plugin
function vibricPlugin() {
  return {
    name: 'vibric-ready',
    transformIndexHtml(html) {
      const vibricScript = \`
<script>
(function() {
  let selectionModeEnabled = true;
  
  function checkCssReady() {
    const styles = document.styleSheets;
    if (styles.length > 0) {
      window.parent.postMessage({ type: 'vibric-css-ready' }, '*');
      return true;
    }
    return false;
  }
  
  function waitForCss() {
    if (!checkCssReady()) setTimeout(waitForCss, 100);
  }
  
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'vibric-selection-mode') {
      selectionModeEnabled = e.data.enabled;
      document.body.style.cursor = selectionModeEnabled ? 'crosshair' : '';
    }
  });
  
  function getSelector(el) {
    if (el.dataset && el.dataset.vibricId) return '[data-vibric-id="' + el.dataset.vibricId + '"]';
    if (el.id) return '#' + el.id;
    let path = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\\\\s+/).filter(c => c).slice(0, 2);
        if (classes.length) selector += '.' + classes.join('.');
      }
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }
  
  function sendElementInfo(type, el) {
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: type,
      data: {
        selector: getSelector(el),
        tagName: el.tagName,
        className: el.className || '',
        textContent: (el.textContent || '').slice(0, 100),
        rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      }
    }, '*');
  }
  
  let hoveredElement = null;
  
  document.addEventListener('mouseover', function(e) {
    if (!selectionModeEnabled) return;
    if (hoveredElement !== e.target) {
      hoveredElement = e.target;
      sendElementInfo('element-hover', e.target);
    }
  }, true);
  
  document.addEventListener('mouseout', function(e) {
    if (!selectionModeEnabled) return;
    if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
      hoveredElement = null;
      window.parent.postMessage({ type: 'element-leave' }, '*');
    }
  }, true);
  
  document.addEventListener('click', function(e) {
    if (!selectionModeEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    sendElementInfo('element-select', e.target);
  }, true);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForCss);
  } else {
    waitForCss();
  }
  
  window.parent.postMessage({ type: 'vibric-iframe-ready' }, '*');
})();
</script>\`;
      return html.replace('</head>', vibricScript + '</head>');
    }
  };
}

export default defineConfig({
  plugins: [react(), vibricPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  }
});`
  }
];

/**
 * 파일 트리에 새 파일 추가 (중첩 경로 지원)
 * 예: addFileToTree(files, 'src/components/Button.tsx', 'content')
 */
export function addFileToTree(
  files: FileNode[],
  filePath: string,
  content: string
): FileNode[] {
  // 내부 재귀 함수 - currentPath는 현재 탐색 중인 경로
  const addRecursively = (
    nodes: FileNode[],
    parts: string[],
    currentPathPrefix: string
  ): FileNode[] => {
    if (parts.length === 0) return nodes;

    const currentName = parts[0];
    const fullPath = currentPathPrefix ? `${currentPathPrefix}/${currentName}` : currentName;
    const isFile = parts.length === 1;

    if (isFile) {
      // 파일 추가/업데이트
      const existingIndex = nodes.findIndex(f => f.path === fullPath);

      if (existingIndex >= 0) {
        // 기존 파일 업데이트
        const updated = [...nodes];
        updated[existingIndex] = { ...updated[existingIndex], content };
        return updated;
      }

      // 새 파일 추가
      return [...nodes, {
        name: currentName,
        path: fullPath,
        type: 'file' as const,
        content
      }];
    }

    // 디렉토리 처리
    const dirIndex = nodes.findIndex(f => f.name === currentName && f.type === 'directory');

    if (dirIndex >= 0) {
      // 기존 디렉토리에 재귀적으로 추가
      const updated = [...nodes];
      updated[dirIndex] = {
        ...updated[dirIndex],
        children: addRecursively(updated[dirIndex].children || [], parts.slice(1), fullPath)
      };
      return updated;
    }

    // 새 디렉토리 생성 후 재귀적으로 추가
    const newDir: FileNode = {
      name: currentName,
      path: fullPath,
      type: 'directory',
      isOpen: true,
      children: addRecursively([], parts.slice(1), fullPath)
    };

    return [...nodes, newDir];
  };

  const parts = filePath.split('/').filter(Boolean);
  return addRecursively(files, parts, '');
}

/**
 * 파일 트리에서 파일 찾기
 */
export function findFileInTree(files: FileNode[], filePath: string): FileNode | undefined {
  for (const file of files) {
    if (file.path === filePath) {
      return file;
    }
    if (file.children) {
      const found = findFileInTree(file.children, filePath);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 파일 트리에서 파일 삭제 (중첩 경로 지원)
 * 예: removeFileFromTree(files, 'src/components/Button.tsx')
 */
export function removeFileFromTree(files: FileNode[], filePath: string): FileNode[] {
  const removeRecursively = (nodes: FileNode[], targetPath: string): FileNode[] => {
    return nodes.reduce<FileNode[]>((acc, node) => {
      // 삭제 대상이면 건너뜀
      if (node.path === targetPath) {
        return acc;
      }

      // 디렉토리면 자식도 재귀적으로 처리
      if (node.children) {
        const filteredChildren = removeRecursively(node.children, targetPath);
        acc.push({ ...node, children: filteredChildren });
      } else {
        acc.push(node);
      }

      return acc;
    }, []);
  };

  return removeRecursively(files, filePath);
}
