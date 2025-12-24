# Vibric 아키텍처 개요

> **문서 버전**: 1.1  
> **최종 수정일**: 2024-12-24

---

## 1. 시스템 개요

Vibric은 AI 기반 바이브코딩 빌더 SaaS 플랫폼입니다. 사용자가 자연어로 요구사항을 설명하면 AI가 코드를 생성하고, Figma 스타일의 캔버스에서 결과물을 시각적으로 편집할 수 있습니다.

### 1.1 핵심 가치 제안
- **AI 코드 생성**: 대화형 인터페이스로 웹 애플리케이션 생성
- **시각적 편집**: Figma 스타일 캔버스에서 드래그 앤 드롭 편집
- **실시간 프리뷰**: WebContainer로 브라우저 내 코드 실행
- **통합 관리**: 내장 DB, Auth, 배포 기능 (Phase 2+)

---

## 2. 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| **Framework** | Next.js 14 (App Router) | SSR, 라우팅, API Routes |
| **Language** | TypeScript | 타입 안전성 |
| **Styling** | Tailwind CSS + Shadcn/ui | 디자인 시스템, UI 컴포넌트 |
| **State** | Zustand | 클라이언트 상태 관리 |
| **Runtime** | @webcontainer/api | 브라우저 내 Node.js 실행 |
| **Editor** | @monaco-editor/react | 코드 에디터 |
| **Terminal** | @xterm/xterm | 터미널 에뮬레이터 |
| **Icons** | Lucide React | 아이콘 라이브러리 |
| **Database** | Supabase (Phase 2+) | PostgreSQL, Auth, Storage |

---

## 3. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ AgentChat    │  │ CanvasEditor │  │ CodeEditor       │   │
│  │ (리사이저블)  │  │ (도트 그리드)  │  │ (Monaco+Term)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    STATE MANAGEMENT (Zustand)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ UIStore      │  │ CanvasStore  │  │ FileSystemStore  │   │
│  │ ChatStore    │  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    RUNTIME LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ AI API       │  │ WebContainer │  │ ArtifactParser   │   │
│  │ (Claude/GPT) │  │ (Browser VM) │  │ (<boltArtifact>) │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 디렉토리 구조

```
vibric-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 메인 에디터 페이지
│   │   ├── globals.css         # 글로벌 스타일
│   │   └── api/                # API Routes
│   │       └── chat/
│   │           └── route.ts    # AI API 프록시
│   │
│   ├── components/             # React 컴포넌트
│   │   ├── shell/              # 앱 셸 컴포넌트
│   │   │   ├── AppShell.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── AgentChat.tsx
│   │   │   ├── MainContent.tsx
│   │   │   └── ResizeHandle.tsx
│   │   ├── canvas/             # 캔버스 컴포넌트
│   │   ├── editor/             # 코드 에디터 컴포넌트
│   │   ├── chat/               # 채팅 컴포넌트
│   │   └── ui/                 # Shadcn UI 컴포넌트
│   │
│   ├── stores/                 # Zustand 스토어
│   │   ├── ui-store.ts
│   │   ├── chat-store.ts
│   │   ├── canvas-store.ts
│   │   ├── filesystem-store.ts
│   │   ├── page-store.ts         # 페이지 관리 (신규)
│   │   └── webcontainer-store.ts # WebContainer 관리 (신규)
│   │
│   ├── lib/                    # 유틸리티
│   │   ├── utils.ts            # 공용 유틸리티
│   │   ├── webcontainer.ts     # WebContainer 래퍼
│   │   ├── ai-client.ts        # AI API 클라이언트
│   │   └── artifact-parser.ts  # Artifact 파서
│   │
│   └── types/                  # TypeScript 타입
│       └── index.ts
│
├── docs/                       # 프로젝트 문서
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── FEATURES.md
│   └── MECHANICS.md
│
├── public/                     # 정적 파일
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 5. 데이터 흐름

### 5.1 AI 코드 생성 흐름

```
1. 사용자 입력 (AgentChat)
       ↓
2. ChatStore.addMessage()
       ↓
3. AI API 호출 (/api/chat)
       ↓
4. 스트리밍 응답 (<boltArtifact> 태그 포함)
       ↓
5. ArtifactParser.parse()
       ↓
6. FileSystemStore.writeFile()
       ↓
7. WebContainer 파일 시스템 업데이트
       ↓
8. CanvasStore.addElement() (프리뷰 요소 추가)
       ↓
9. 실시간 프리뷰 (iframe)
```

### 5.2 Canvas 편집 → 코드 동기화 흐름

```
1. 사용자가 캔버스 요소 드래그/리사이즈
       ↓
2. CanvasStore.updateElement()
       ↓
3. 요소의 filePath로 해당 파일 찾기
       ↓
4. 스타일 변경사항 → CSS/Tailwind 클래스 변환
       ↓
5. FileSystemStore.updateFile()
       ↓
6. WebContainer 파일 업데이트
       ↓
7. 실시간 프리뷰 자동 갱신
```

---

## 6. 스토어 설계

### 6.1 UIStore
- **역할**: UI 상태 관리 (사이드바, 탭, 터미널)
- **상태**: `sidebarWidth`, `activeTab`, `isTerminalOpen`

### 6.2 ChatStore
- **역할**: 채팅 메시지 관리
- **상태**: `messages`, `isLoading`, `inputValue`

### 6.3 CanvasStore
- **역할**: 캔버스 요소, 뷰포트, 선택 모드 관리
- **상태**: `viewport`, `elements`, `selectedIds`, `isSelectionModeEnabled`, `selectedElement`, `hoveredElement`
- **액션**: `toggleSelectionMode()`, `setSelectedElement()`, `setHoveredElement()`

### 6.4 FileSystemStore
- **역할**: 가상 파일 시스템 관리
- **상태**: `files`, `activeFilePath`, `openFiles`, `serverUrl`

### 6.5 PageStore (신규)
- **역할**: 페이지 목록 및 활성 페이지 관리
- **상태**: `pages`, `activePageId`, `isMissionControlOpen`
- **액션**: `syncFromFileSystem()`, `setActivePage()`, `addPage()`, `removePage()`

### 6.6 WebContainerStore (신규)
- **역할**: WebContainer 인스턴스 및 상태 관리
- **상태**: `instance`, `status`, `previewUrl`, `terminalOutput`
- **액션**: `boot()`, `mountFiles()`, `startDevServer()`, `writeFile()`

---

## 7. 보안 고려사항

### 7.1 API 키 보호
- AI API 키는 서버 사이드에서만 사용 (`/api/chat`)
- 환경 변수로 관리 (`.env.local`)

### 7.2 WebContainer 샌드박싱
- 브라우저 내 격리된 환경에서 코드 실행
- 시스템 리소스 접근 제한

### 7.3 사용자 입력 검증
- AI 응답의 Artifact 태그 파싱 시 XSS 방지
- 파일 경로 traversal 공격 방지

---

## 8. 확장성 계획

### Phase 2: Dashboard
- Project Settings
- Database (Supabase 통합)
- Analytics
- Domains
- Logs
- Authentication

### Phase 3: 협업 기능
- 실시간 멀티플레이어 편집
- 버전 히스토리
- 팀 워크스페이스

---

**문서 끝**
