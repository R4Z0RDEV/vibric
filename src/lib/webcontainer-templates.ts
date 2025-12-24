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

// 기본 프로젝트 템플릿 - npm 없이 Node.js 내장 HTTP 서버 사용
export const defaultProjectFiles: FileSystemTree = {
  'server.js': {
    file: {
      contents: `const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(\`Server running at http://localhost:\${PORT}/\`);
});
`
    }
  },
  'index.html': {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vibric Preview</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="hero" data-vibric-id="hero">
      <h1>Welcome to Vibric</h1>
      <p>AI-Powered Vibe Coding Builder</p>
    </div>

    <div class="cards">
      <div class="card" data-vibric-id="feature-canvas">
        <h3>Canvas</h3>
        <p>Visual editing experience</p>
      </div>
      <div class="card" data-vibric-id="feature-code">
        <h3>Code</h3>
        <p>Live code editor</p>
      </div>
      <div class="card" data-vibric-id="feature-ai">
        <h3>AI</h3>
        <p>AI-powered assistance</p>
      </div>
    </div>

    <button class="btn" data-vibric-id="cta-button">Get Started</button>

    <script src="app.js"></script>
  </body>
</html>`
    }
  },
  'styles.css': {
    file: {
      contents: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
    font-family: system-ui, -apple-system, sans-serif; 
    background: #09090b;
    color: white;
    min-height: 100vh;
    padding: 2rem;
}
.hero {
    padding: 2rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 1rem;
    margin-bottom: 2rem;
}
.hero h1 { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
.hero p { opacity: 0.8; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
.card { padding: 1.5rem; background: #27272a; border-radius: 0.5rem; cursor: pointer; transition: transform 0.2s; }
.card:hover { transform: translateY(-2px); }
.card h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
.card p { font-size: 0.875rem; color: #a1a1aa; }
.btn { 
    padding: 0.75rem 1.5rem; 
    background: #3b82f6; 
    color: white; 
    font-weight: 500; 
    border-radius: 0.5rem; 
    border: none; 
    cursor: pointer;
    transition: background 0.2s;
}
.btn:hover { background: #2563eb; }`
    }
  },
  'app.js': {
    file: {
      contents: `// Vibric element selection support
document.querySelectorAll('[data-vibric-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        window.parent.postMessage({
            type: 'element-select',
            data: {
                id: el.dataset.vibricId,
                tagName: el.tagName.toLowerCase(),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            }
        }, '*');
    });
    el.addEventListener('mouseenter', () => {
        const rect = el.getBoundingClientRect();
        window.parent.postMessage({
            type: 'element-hover',
            data: {
                id: el.dataset.vibricId,
                tagName: el.tagName.toLowerCase(),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            }
        }, '*');
    });
    el.addEventListener('mouseleave', () => {
        window.parent.postMessage({ type: 'element-leave' }, '*');
    });
});
console.log('Vibric Preview loaded');`
    }
  }
};

// 기본 파일 노드 생성 (FileSystemStore 초기화용) - 중첩 디렉토리 구조
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
        name: 'hooks',
        path: 'src/hooks',
        type: 'directory',
        isOpen: false,
        children: [],
      },
      {
        name: 'lib',
        path: 'src/lib',
        type: 'directory',
        isOpen: false,
        children: [],
      },
    ],
  },
  {
    name: 'server.js',
    path: 'server.js',
    type: 'file',
    content: `const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
};

const server = http.createServer((req, res) => {
    let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Not found' : 'Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(3001, '0.0.0.0', () => console.log('Server on port 3001'));`
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
    <title>Vibric Preview</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="hero" data-vibric-id="hero">
      <h1>Welcome to Vibric</h1>
      <p>AI-Powered Vibe Coding Builder</p>
    </div>

    <div class="cards">
      <div class="card" data-vibric-id="feature-canvas">
        <h3>Canvas</h3>
        <p>Visual editing experience</p>
      </div>
      <div class="card" data-vibric-id="feature-code">
        <h3>Code</h3>
        <p>Live code editor</p>
      </div>
      <div class="card" data-vibric-id="feature-ai">
        <h3>AI</h3>
        <p>AI-powered assistance</p>
      </div>
    </div>

    <button class="btn" data-vibric-id="cta-button">Get Started</button>

    <script src="app.js"></script>
  </body>
</html>`
  },
  {
    name: 'styles.css',
    path: 'styles.css',
    type: 'file',
    content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
    font-family: system-ui, -apple-system, sans-serif; 
    background: #09090b;
    color: white;
    min-height: 100vh;
    padding: 2rem;
}
.hero {
    padding: 2rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 1rem;
    margin-bottom: 2rem;
}
.hero h1 { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
.hero p { opacity: 0.8; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
.card { padding: 1.5rem; background: #27272a; border-radius: 0.5rem; cursor: pointer; transition: transform 0.2s; }
.card:hover { transform: translateY(-2px); }
.card h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
.card p { font-size: 0.875rem; color: #a1a1aa; }
.btn { 
    padding: 0.75rem 1.5rem; 
    background: #3b82f6; 
    color: white; 
    font-weight: 500; 
    border-radius: 0.5rem; 
    border: none; 
    cursor: pointer;
    transition: background 0.2s;
}
.btn:hover { background: #2563eb; }`
  },
  {
    name: 'app.js',
    path: 'app.js',
    type: 'file',
    content: `// Vibric element selection support
document.querySelectorAll('[data-vibric-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        window.parent.postMessage({
            type: 'element-select',
            data: {
                id: el.dataset.vibricId,
                tagName: el.tagName.toLowerCase(),
                className: el.className || '',
                textContent: (el.textContent || '').substring(0, 50),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                selector: '[data-vibric-id="' + el.dataset.vibricId + '"]'
            }
        }, '*');
    });
    el.addEventListener('mouseenter', () => {
        const rect = el.getBoundingClientRect();
        window.parent.postMessage({
            type: 'element-hover',
            data: {
                id: el.dataset.vibricId,
                tagName: el.tagName.toLowerCase(),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                selector: '[data-vibric-id="' + el.dataset.vibricId + '"]'
            }
        }, '*');
    });
    el.addEventListener('mouseleave', () => {
        window.parent.postMessage({ type: 'element-leave' }, '*');
    });
});
console.log('Vibric Preview loaded');`
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
    content: `{
  "name": "vibric-preview",
  "version": "1.0.0",
  "description": "Vibric Preview Project",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  }
}`
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
