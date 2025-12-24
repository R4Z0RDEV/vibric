# Vibric 개발 로드맵

> **버전**: 1.0  
> **최종 수정일**: 2024-12-23

---

## 프로젝트 개요

Vibric은 브라우저 기반 AI 바이브 코딩 빌더입니다. 사용자가 자연어로 설명하면 AI가 코드를 생성하고, Canvas에서 시각적으로 편집하며, 브라우저 내에서 즉시 실행할 수 있습니다.

---

## Phase 1: 기반 구축 ✅ 완료

### 목표
프로젝트 초기화, 디자인 시스템, 핵심 레이아웃 구현

### 완료된 작업

| 항목 | 상태 | 파일 |
|------|------|------|
| Next.js 14 프로젝트 초기화 | ✅ | - |
| Tailwind CSS + Shadcn/ui 설정 | ✅ | `tailwind.config.ts` |
| Apple Liquid Glass 디자인 시스템 | ✅ | `globals.css` |
| AppShell 레이아웃 | ✅ | `components/shell/*` |
| Zustand 스토어 (UI, Chat, Canvas, FileSystem) | ✅ | `stores/*` |
| 프로젝트 문서 | ✅ | `docs/*` |

---

## Phase 2: Canvas 구현 🔜

### 목표
Figma 스타일의 무한 캔버스 및 요소 조작 기능

### 작업 목록

| 항목 | 우선순위 | 예상 시간 |
|------|----------|-----------|
| CanvasStage 컴포넌트 (무한 캔버스) | P0 | 4h |
| 팬/줌 기능 (마우스 + 터치) | P0 | 2h |
| 요소 선택/드래그/리사이즈 | P0 | 4h |
| 레이어 패널 | P1 | 3h |
| 플로팅 툴바 | P1 | 2h |
| 속성 패널 (우측) | P1 | 3h |
| 컴포넌트 라이브러리 | P2 | 4h |

### 기술 사항
- Canvas 렌더링: HTML/CSS 또는 `react-konva`
- 상태 관리: `canvas-store.ts` 사용
- 좌표 시스템: 월드 좌표 ↔ 스크린 좌표 변환

---

## Phase 3: Code 에디터 구현

### 목표
Monaco 에디터 + 파일 트리 + 터미널 통합

### 작업 목록

| 항목 | 우선순위 | 예상 시간 |
|------|----------|-----------|
| Monaco 에디터 통합 | P0 | 2h |
| 파일 트리 컴포넌트 | P0 | 3h |
| 탭 기반 파일 편집 | P0 | 2h |
| Xterm 터미널 통합 | P1 | 3h |
| WebContainer 연동 | P1 | 4h |
| 실시간 프리뷰 (iframe) | P1 | 2h |

### 기술 사항
- 에디터: `@monaco-editor/react`
- 터미널: `@xterm/xterm` + `@xterm/addon-fit`
- 실행 환경: `@webcontainer/api`

---

## Phase 4: AI 연동

### 목표
AI 코드 생성 및 Canvas 동기화

### 작업 목록

| 항목 | 우선순위 | 예상 시간 |
|------|----------|-----------|
| AI API 라우트 설정 | P0 | 2h |
| 스트리밍 응답 처리 | P0 | 3h |
| Artifact 파싱 (`<boltArtifact>`) | P0 | 4h |
| 코드 → Canvas 동기화 | P1 | 6h |
| Canvas → 코드 동기화 | P1 | 6h |
| 프롬프트 템플릿 시스템 | P2 | 3h |

### 기술 사항
- AI Provider: Claude API 또는 OpenAI
- Artifact 형식: XML 기반 (`<boltArtifact>`, `<boltAction>`)
- 파싱: `@xmldom/xmldom` 또는 커스텀 파서

---

## Phase 5: Assets & Dashboard

### 목표
에셋 관리 및 프로젝트 설정

### 작업 목록

| 항목 | 우선순위 | 예상 시간 |
|------|----------|-----------|
| 에셋 업로드 (이미지, 폰트) | P1 | 3h |
| 에셋 갤러리 뷰 | P1 | 2h |
| 프로젝트 설정 페이지 | P2 | 3h |
| 환경 변수 관리 | P2 | 2h |
| 배포 설정 (Vercel) | P2 | 4h |

---

## Phase 6: 인증 & 데이터베이스

### 목표
사용자 인증 및 프로젝트 저장

### 작업 목록

| 항목 | 우선순위 | 예상 시간 |
|------|----------|-----------|
| Supabase Auth 연동 | P1 | 3h |
| 프로젝트 CRUD | P1 | 4h |
| 실시간 자동 저장 | P1 | 3h |
| 버전 히스토리 | P2 | 4h |
| 팀 협업 | P3 | 8h |

---

## 기술 스택 요약

| 카테고리 | 기술 |
|----------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS + Shadcn/ui |
| 상태 관리 | Zustand |
| 에디터 | Monaco Editor |
| 터미널 | Xterm.js |
| 런타임 | WebContainer API |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth |
| AI | Claude API / OpenAI |

---

## 디렉토리 구조

```
vibric-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 라우트
│   │   ├── globals.css     # 디자인 토큰
│   │   ├── layout.tsx      # 루트 레이아웃
│   │   └── page.tsx        # 메인 페이지
│   ├── components/
│   │   ├── shell/          # AppShell 컴포넌트
│   │   ├── canvas/         # Canvas 컴포넌트 (Phase 2)
│   │   ├── editor/         # 에디터 컴포넌트 (Phase 3)
│   │   └── ui/             # Shadcn UI
│   ├── stores/             # Zustand 스토어
│   ├── types/              # TypeScript 타입
│   ├── lib/                # 유틸리티
│   └── hooks/              # 커스텀 훅
├── docs/                   # 프로젝트 문서
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── FEATURES.md
│   ├── MECHANICS.md
│   └── ROADMAP.md          # 이 문서
└── package.json
```

---

## 마일스톤

| 마일스톤 | Phase | 목표일 |
|----------|-------|--------|
| **M1: MVP Canvas** | Phase 1-2 | - |
| **M2: Code Editor** | Phase 3 | - |
| **M3: AI Integration** | Phase 4 | - |
| **M4: Production Ready** | Phase 5-6 | - |

---

**문서 끝**
