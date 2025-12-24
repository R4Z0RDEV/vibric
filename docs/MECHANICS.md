# Vibric 로직 및 매커니즘

> **문서 버전**: 1.1  
> **최종 수정일**: 2024-12-24

---

## 1. 핵심 매커니즘 개요

Vibric의 핵심 매커니즘은 **AI-Canvas-Code 삼각 동기화**입니다.

```
         ┌─────────────┐
         │   AI Agent  │
         └──────┬──────┘
                │ generates
                ▼
    ┌───────────────────────┐
    │   Artifact Parser     │
    │ (<boltArtifact> tags) │
    └───────────┬───────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│    Canvas     │◀│  File System  │
│  (Visual)     │▶│    (Code)     │
└───────────────┘ └───────────────┘
        │               │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  WebContainer │
        │  (Preview)    │
        └───────────────┘
```

---

## 2. AI 코드 생성 매커니즘

### 2.1 Artifact 파싱 플로우

```typescript
// AI 응답 예시
const aiResponse = `
랜딩 페이지를 만들어 드리겠습니다.

<boltArtifact id="landing" title="랜딩 페이지">
<boltAction type="file" filePath="src/app/page.tsx">
export default function LandingPage() {
  return <h1>Hello World</h1>;
}
</boltAction>
</boltArtifact>

이제 페이지가 캔버스에 표시됩니다.
`;

// 파싱 결과
interface ParsedArtifact {
  id: string;
  title: string;
  actions: BoltAction[];
}

interface BoltAction {
  type: 'file' | 'shell';
  filePath?: string;
  content: string;
}
```

### 2.2 파싱 알고리즘

```typescript
function parseArtifacts(response: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];
  
  // 1. <boltArtifact> 태그 찾기
  const artifactRegex = /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/g;
  
  let match;
  while ((match = artifactRegex.exec(response)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    
    // 2. 속성 추출
    const id = extractAttribute(fullMatch, 'id');
    const title = extractAttribute(fullMatch, 'title');
    
    // 3. 액션 파싱
    const actions = parseActions(content);
    
    artifacts.push({ id, title, actions });
  }
  
  return artifacts;
}
```

### 2.3 파일 생성 플로우

```
1. Artifact 파싱 완료
       ↓
2. 각 boltAction 순회
       ↓
3. type === 'file' → FileSystemStore.writeFile()
       ↓
4. type === 'shell' → 터미널에서 실행
       ↓
5. WebContainer 파일 시스템 업데이트
       ↓
6. CanvasStore.addElement() (페이지/컴포넌트는 캔버스에 추가)
```

---

## 3. Canvas-Code 동기화 매커니즘

### 3.1 Canvas → Code (드래그 편집)

```typescript
// 1. 드래그 이벤트 핸들러
function handleDragEnd(element: CanvasElement, newPosition: Position) {
  // 2. CanvasStore 업데이트
  canvasStore.updateElement(element.id, {
    x: newPosition.x,
    y: newPosition.y,
  });
  
  // 3. 연결된 파일이 있으면 코드 동기화
  if (element.filePath) {
    syncToCode(element);
  }
}

// 4. 코드 동기화 함수
function syncToCode(element: CanvasElement) {
  const file = fileSystemStore.getFile(element.filePath);
  
  // 5. 스타일 변경사항 추출
  const styleChanges = calculateStyleChanges(element);
  
  // 6. 코드 AST 파싱 후 스타일 업데이트
  const updatedCode = updateStylesInCode(file.content, styleChanges);
  
  // 7. 파일 저장
  fileSystemStore.updateFile(element.filePath, updatedCode);
}
```

### 3.2 Code → Canvas (코드 편집)

```typescript
// 1. Monaco 에디터 onChange
function handleCodeChange(path: string, newContent: string) {
  // 2. 파일 저장
  fileSystemStore.updateFile(path, newContent);
  
  // 3. 연결된 캔버스 요소 찾기
  const elements = canvasStore.elements.filter(
    (el) => el.filePath === path
  );
  
  // 4. 각 요소의 프리뷰 업데이트
  elements.forEach((element) => {
    refreshPreview(element);
  });
}
```

### 3.3 스타일 변환 규칙

| Canvas 속성 | Tailwind 클래스 | CSS 속성 |
|-------------|-----------------|----------|
| x, y | `top-[Npx] left-[Npx]` | `top: Npx; left: Npx;` |
| width | `w-[Npx]` | `width: Npx;` |
| height | `h-[Npx]` | `height: Npx;` |
| rotation | `rotate-[Ndeg]` | `transform: rotate(Ndeg);` |

---

## 4. WebContainer 매커니즘

### 4.1 부트스트랩 플로우

```typescript
async function bootWebContainer() {
  // 1. WebContainer 인스턴스 생성
  const instance = await WebContainer.boot();
  
  // 2. 기본 파일 구조 마운트
  await instance.mount({
    'package.json': {
      file: {
        contents: JSON.stringify({
          name: 'vibric-project',
          scripts: {
            dev: 'next dev',
            build: 'next build',
          },
          dependencies: {
            next: 'latest',
            react: 'latest',
            'react-dom': 'latest',
          },
        }),
      },
    },
  });
  
  // 3. npm install 실행
  const installProcess = await instance.spawn('npm', ['install']);
  await installProcess.exit;
  
  // 4. 서버 시작
  const devProcess = await instance.spawn('npm', ['run', 'dev']);
  
  // 5. 서버 URL 가져오기
  instance.on('server-ready', (port, url) => {
    fileSystemStore.setServerUrl(url);
  });
}
```

### 4.2 파일 시스템 동기화

```typescript
async function syncFile(path: string, content: string) {
  // WebContainer 파일 시스템에 쓰기
  await webContainer.fs.writeFile(path, content);
  
  // 개발 서버가 자동으로 HMR 적용
}
```

### 4.3 터미널 연동

```typescript
// 터미널 명령어 실행
async function runCommand(command: string) {
  const [cmd, ...args] = command.split(' ');
  
  const process = await webContainer.spawn(cmd, args);
  
  // 출력 스트리밍
  process.output.pipeTo(new WritableStream({
    write(data) {
      terminalStore.appendOutput(data);
    },
  }));
  
  return process.exit;
}
```

---

## 5. 상태 관리 매커니즘

### 5.1 Zustand 스토어 구조

```
┌─────────────────────────────────────────────────┐
│                    Stores                        │
├─────────────────────────────────────────────────┤
│ UIStore           │ sidebarWidth, activeTab,    │
│                   │ isTerminalOpen              │
├───────────────────┼─────────────────────────────┤
│ ChatStore         │ messages, isLoading,        │
│                   │ inputValue                  │
├───────────────────┼─────────────────────────────┤
│ CanvasStore       │ viewport, elements,         │
│                   │ selectedIds                 │
├───────────────────┼─────────────────────────────┤
│ FileSystemStore   │ files, activeFilePath,      │
│                   │ openFiles, serverUrl        │
└───────────────────┴─────────────────────────────┘
```

### 5.2 스토어 간 통신

스토어 간 직접 의존성을 피하고, 컴포넌트에서 필요한 스토어를 조합:

```typescript
// 컴포넌트에서 여러 스토어 사용
function CanvasEditor() {
  const { elements, updateElement } = useCanvasStore();
  const { updateFile } = useFileSystemStore();
  
  const handleDrag = (id: string, pos: Position) => {
    updateElement(id, pos);
    
    const element = elements.find((e) => e.id === id);
    if (element?.filePath) {
      // 코드 동기화
      updateFile(element.filePath, generateCode(element));
    }
  };
}
```

---

## 6. 캔버스 렌더링 매커니즘

### 6.1 뷰포트 변환

```typescript
// 월드 좌표 → 스크린 좌표
function worldToScreen(worldPos: Position, viewport: Viewport): Position {
  return {
    x: (worldPos.x - viewport.x) * viewport.zoom,
    y: (worldPos.y - viewport.y) * viewport.zoom,
  };
}

// 스크린 좌표 → 월드 좌표
function screenToWorld(screenPos: Position, viewport: Viewport): Position {
  return {
    x: screenPos.x / viewport.zoom + viewport.x,
    y: screenPos.y / viewport.zoom + viewport.y,
  };
}
```

### 6.2 줌/팬 구현

```typescript
// 팬 (마우스 드래그 또는 스페이스 + 드래그)
function handlePan(deltaX: number, deltaY: number) {
  canvasStore.pan(deltaX / viewport.zoom, deltaY / viewport.zoom);
}

// 줌 (마우스 휠 또는 핀치)
function handleZoom(delta: number, centerX: number, centerY: number) {
  const scale = delta > 0 ? 1.1 : 0.9;
  canvasStore.zoom(scale, centerX, centerY);
}
```

### 6.3 요소 렌더링

```typescript
function renderElements() {
  return elements.map((element) => (
    <CanvasElement
      key={element.id}
      element={element}
      style={{
        position: 'absolute',
        left: (element.x - viewport.x) * viewport.zoom,
        top: (element.y - viewport.y) * viewport.zoom,
        width: element.width * viewport.zoom,
        height: element.height * viewport.zoom,
      }}
    />
  ));
}
```

---

## 7. 에러 처리 매커니즘

### 7.1 AI API 에러

```typescript
async function sendMessage(content: string) {
  try {
    chatStore.setLoading(true);
    const response = await fetch('/api/chat', { ... });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // 스트리밍 처리
  } catch (error) {
    chatStore.addMessage({
      role: 'assistant',
      content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
    });
  } finally {
    chatStore.setLoading(false);
  }
}
```

### 7.2 WebContainer 에러

```typescript
async function bootWebContainer() {
  try {
    // 부트스트랩
  } catch (error) {
    if (error.message.includes('SharedArrayBuffer')) {
      // Cross-origin isolation 필요
      showError('브라우저 설정이 필요합니다.');
    } else if (error.message.includes('not supported')) {
      // 브라우저 미지원
      showError('Chrome 브라우저를 사용해주세요.');
    }
  }
}
```

### 7.3 파일 시스템 에러

```typescript
function writeFile(path: string, content: string) {
  try {
    // 경로 검증 (traversal 공격 방지)
    if (path.includes('..')) {
      throw new Error('Invalid path');
    }
    
    // 파일 쓰기
    fileSystemStore.updateFile(path, content);
  } catch (error) {
    console.error('File write error:', error);
  }
}
```

---

## 8. 성능 최적화 매커니즘

### 8.1 캔버스 최적화

- **가상화**: 뷰포트 밖 요소는 렌더링하지 않음
- **메모이제이션**: `React.memo`로 불필요한 리렌더링 방지
- **requestAnimationFrame**: 부드러운 애니메이션

### 8.2 코드 에디터 최적화

- **Lazy Loading**: Monaco 에디터 동적 임포트
- **Debounce**: 타이핑 중 파일 저장 지연
- **Web Worker**: Monaco의 언어 서비스

### 8.3 상태 업데이트 최적화

```typescript
// 선택적 구독 (필요한 상태만 구독)
const selectedIds = useCanvasStore((state) => state.selectedIds);

// 얕은 비교로 불필요한 리렌더링 방지
const elements = useCanvasStore(
  (state) => state.elements,
  shallow
);
```

---

## 9. 요소 선택 매커니즘

### 9.1 선택 모드 활성화

```typescript
// canvas-store.ts
interface CanvasState {
   isSelectionModeEnabled: boolean;
   selectedElement: SelectedElementInfo | null;
   hoveredElement: HoveredElementInfo | null;
   
   toggleSelectionMode: () => void;
   setSelectionMode: (enabled: boolean) => void;
}

// 선택 모드 토글 시 관련 상태 초기화
toggleSelectionMode: () => set((state) => ({
   isSelectionModeEnabled: !state.isSelectionModeEnabled,
   selectedElement: null,
   hoveredElement: null,
})),
```

### 9.2 iframe 좌표 보정

iframe 내부의 `getBoundingClientRect()`는 iframe 뷰포트 기준 좌표를 반환합니다.  
브라우저 헤더(URL 바 등) 높이를 고려하여 좌표를 보정해야 합니다:

```typescript
// PagePreview.tsx handleIframeMessage
const handleIframeMessage = useCallback((event: MessageEvent) => {
   const { type, data } = event.data;
   
   // iframe ↔ container 상대 오프셋 계산
   const iframe = iframeRef.current;
   const container = containerRef.current;
   
   if (iframe && container && data?.rect) {
       const iframeRect = iframe.getBoundingClientRect();
       const containerRect = container.getBoundingClientRect();
       
       // 좌표 보정
       data.rect.x += iframeRect.left - containerRect.left;
       data.rect.y += iframeRect.top - containerRect.top;
   }
   
   // 메시지 타입별 처리
   switch (type) {
       case 'element-hover': setHoveredElement(data); break;
       case 'element-select': setSelectedElement(data); break;
       case 'element-leave': setHoveredElement(null); break;
   }
}, []);
```

---

## 10. 페이지 동적 로딩 매커니즘

### 10.1 파일 시스템 → 페이지 동기화

```typescript
// page-store.ts
const PAGE_EXTENSIONS = ['.html', '.tsx', '.jsx', '.vue', '.svelte', '.astro'];

// 프레임워크 특수 파일 제외 패턴
const EXCLUDED_PATTERNS = [
   /^_/,           // _app.tsx, _document.tsx
   /^\[/,          // [slug].tsx (동적 라우트)
   /\.test\./,     // *.test.tsx
   /layout\./,     // layout.tsx (App Router)
   /error\./,      // error.tsx
];

// 페이지 추출 함수
function extractPagesFromFiles(files: FileNode[]): Page[] {
   // 1. PAGE_EXTENSIONS 확장자 파일 필터링
   // 2. EXCLUDED_PATTERNS 제외
   // 3. pages/, app/, routes/ 디렉토리 구조 인식
   // 4. index.tsx / page.tsx → 해당 디렉토리 라우트
}

// 동기화 액션
syncFromFileSystem: (files) => set((state) => {
   const pages = extractPagesFromFiles(files);
   return { pages, activePageId: pages[0]?.id || null };
}),
```

### 10.2 WebContainer 초기화 시 동기화

```typescript
// useWebContainer.ts initialize()
const initialize = async () => {
   // 1. WebContainer 부트
   await boot();
   
   // 2. 파일 시스템 설정
   setFiles(defaultFileNodes);
   
   // 3. 페이지 스토어 동기화 ← 추가됨
   syncFromFileSystem(currentFiles);
   
   // 4. 파일 마운트
   await mountFiles(fileTree);
   
   // 5. 서버 시작
   await startDevServer();
};
```

---

**문서 끝**
