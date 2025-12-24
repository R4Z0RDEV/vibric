# Advanced Agent Actions System Design

> AI 에이전트가 파일 조작 외에 커맨드 실행, 코드 분석, 디버깅, 웹 검색까지 복합적으로 수행할 수 있는 시스템

## 1. 개요

### 목표
- 에이전트가 **12가지 액션 타입**을 유기적으로 조합하여 복합 워크플로우 수행
- Spec Mode / Fast Mode에 따른 차등 실행 방식
- 에러 발생 시 자동 복구 및 웹 검색을 통한 해결책 탐색

### 핵심 결정 사항
| 항목 | 결정 |
|------|------|
| 스코프 | 복합 워크플로우 (모든 액션 지원) |
| 실행 방식 | Spec Mode = 단계별 승인 / Fast Mode = 완전 자동화 |
| 에러 처리 | Fast = 자동 복구 (3회) + 웹 검색 / Spec = 즉시 보고 |
| 검색 API | Tavily (AI 에이전트 특화) |

---

## 2. 액션 타입 (총 12개)

### 2.1 파일 액션 (File) - 기존
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `create_file` | 새 파일 생성 | `<action type="create_file" path="src/Button.tsx">...</action>` |
| `modify_file` | 기존 파일 수정 | `<action type="modify_file" path="src/Button.tsx" lines="+10">...</action>` |
| `delete_file` | 파일 삭제 | `<action type="delete_file" path="src/old.tsx" />` |

### 2.2 커맨드 액션 (Command)
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `run_command` | 터미널 명령 실행 | `<action type="run_command" command="npm install lodash" timeout="60000" />` |

### 2.3 분석 액션 (Analysis)
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `read_file` | 파일 내용 읽기 | `<action type="read_file" path="src/Button.tsx" />` |
| `list_files` | 디렉토리 구조 확인 | `<action type="list_files" path="src/" recursive="true" />` |
| `analyze_code` | 코드 분석 | `<action type="analyze_code" path="src/" target="dependencies" />` |

### 2.4 디버깅 액션 (Debug)
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `get_logs` | 로그 수집 | `<action type="get_logs" lines="50" source="terminal" />` |
| `get_errors` | 에러 정보 수집 | `<action type="get_errors" />` |

### 2.5 브라우저 액션 (Browser)
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `refresh_preview` | 프리뷰 새로고침 | `<action type="refresh_preview" />` |
| `navigate_to` | URL 이동 | `<action type="navigate_to" url="/about" />` |

### 2.6 검색 액션 (Search)
| 타입 | 설명 | XML 예시 |
|------|------|----------|
| `web_search` | 웹 검색 (Tavily) | `<action type="web_search" query="React hydration error fix" />` |

---

## 3. 아키텍처

### 3.1 시스템 흐름
```
User Request
    ↓
AI Agent (Gemini)
    ↓
┌─────────────────────────────────────┐
│  ActionExecutor                      │
│  ├── FileActions      (파일 조작)     │
│  ├── CommandActions   (터미널 실행)   │
│  ├── AnalysisActions  (코드 분석)     │
│  ├── DebugActions     (디버깅/로그)   │
│  ├── BrowserActions   (프리뷰 제어)   │
│  └── SearchActions    (웹 검색)       │
└─────────────────────────────────────┘
    ↓
WebContainer / FileSystem / Preview / Tavily API
```

### 3.2 파일 구조
```
src/lib/
├── action-executor/
│   ├── index.ts              # ActionExecutor 메인 클래스
│   ├── types.ts              # 모든 액션 타입 정의
│   ├── file-actions.ts       # create/modify/delete/read
│   ├── command-actions.ts    # run_command
│   ├── analysis-actions.ts   # list_files, analyze_code
│   ├── debug-actions.ts      # get_logs, get_errors
│   ├── browser-actions.ts    # refresh_preview, navigate_to
│   └── search-actions.ts     # web_search (Tavily)

src/app/api/
├── search/
│   └── route.ts              # Tavily API 프록시
```

### 3.3 수정할 파일
| 파일 | 변경 내용 |
|------|----------|
| `streaming-parser.ts` | 새 액션 타입 파싱 지원 |
| `prompts.ts` | AI에게 새 액션 사용법 안내 |
| `AgentChat.tsx` | ActionExecutor 연동 |
| `webcontainer-store.ts` | 커맨드 실행/로그 수집 기능 |
| `ActionLog.tsx` | 새 액션 타입 UI 표시 |

---

## 4. 모드별 실행 방식

### 4.1 Fast Mode (완전 자동화)
```
AI가 계획 수립 → 모든 액션 자동 실행 → 결과 보고
```
- 사용자 승인 없이 연속 실행
- 에러 시 자동 복구 시도 (최대 3회)
- 복구 실패 시 웹 검색 후 추가 3회 재시도
- 최종 실패 시 사용자에게 보고

### 4.2 Spec Mode (단계별 승인)
```
AI가 다음 액션 제안 → 사용자 승인 → 실행 → 반복
```
- 각 위험 액션마다 승인 필요
- 에러 시 즉시 사용자에게 보고
- 선택지 제시: [자동 복구] [수동 해결] [건너뛰기]

---

## 5. 에러 처리 & 복구 로직

### 5.1 복구 흐름 (Fast Mode)
```
Action 실행 → 에러 발생
    ↓
AI가 에러 분석 (자동)
    ↓
복구 전략 선택 & 재시도 (최대 3회)
    ↓
실패 시 → 웹 검색 (Tavily)
    ↓
검색 결과 분석 → 새로운 복구 전략 도출
    ↓
추가 3회 재시도
    ↓
여전히 실패 → 사용자에게 보고 + 검색 결과 링크 제공
```

### 5.2 일반적인 복구 전략
| 에러 유형 | 복구 전략 |
|----------|----------|
| `ENOENT` (파일 없음) | 상위 디렉토리 생성 후 재시도 |
| `ERESOLVE` (npm 충돌) | `--legacy-peer-deps` 플래그 추가 |
| `EADDRINUSE` (포트 충돌) | 다른 포트로 재시도 |
| `SyntaxError` | AI가 코드 분석 후 수정 |
| `Timeout` | 타임아웃 늘려서 재시도 |

### 5.3 에러 타입 정의
```typescript
interface ActionError {
  action: ActionItem;
  error: string;
  stdout?: string;
  stderr?: string;
  suggestedFix?: string;
  retryCount: number;
  searchResults?: TavilyResult[];
}
```

---

## 6. Tavily 웹 검색 통합

### 6.1 API 엔드포인트
```typescript
// src/app/api/search/route.ts
POST /api/search
Body: { query: string }
Response: { results: TavilyResult[] }
```

### 6.2 사용 시나리오
1. 에러 메시지를 검색 쿼리로 변환
2. Tavily API로 검색 (Stack Overflow, GitHub Issues 우선)
3. 검색 결과를 AI 컨텍스트에 주입
4. AI가 해결책 도출 및 적용

---

## 7. UI 표시

### 7.1 액션 로그 아이콘 매핑
| 액션 타입 | 아이콘 | 색상 |
|----------|--------|------|
| `create_file` | 📄 FilePlus | 초록 |
| `modify_file` | ✏️ FileEdit | 황색 |
| `delete_file` | 🗑️ Trash | 적색 |
| `run_command` | ⚡ Terminal | 황색 |
| `read_file` / `list_files` | 📖 FileSearch | 청색 |
| `analyze_code` | 🔬 Microscope | 보라 |
| `web_search` | 🌐 Globe | 초록 |
| `get_logs` / `get_errors` | 🐛 Bug | 적색 |
| `refresh_preview` / `navigate_to` | 🔄 RefreshCw | 청색 |

### 7.2 Spec Mode 승인 다이얼로그
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 다음 명령을 실행할까요?                           │
│                                                     │
│ $ npm install --save-dev typescript                 │
│                                                     │
│ [✅ 승인] [❌ 거부] [⏭️ 건너뛰기]                    │
└─────────────────────────────────────────────────────┘
```

---

## 8. 구현 순서 (권장)

### Phase 1: 기반 구조
1. `ActionExecutor` 클래스 및 타입 정의
2. `streaming-parser.ts` 확장
3. 기존 파일 액션 마이그레이션

### Phase 2: 커맨드 & 분석
4. `run_command` 구현 (webcontainer-store 연동)
5. `read_file`, `list_files` 구현
6. `analyze_code` 구현

### Phase 3: 디버깅 & 브라우저
7. `get_logs`, `get_errors` 구현
8. `refresh_preview`, `navigate_to` 구현

### Phase 4: 웹 검색 & 복구
9. Tavily API 통합
10. 자동 복구 로직 구현

### Phase 5: UI & 모드
11. ActionLog 컴포넌트 확장
12. Spec Mode 승인 UI 구현
13. 프롬프트 업데이트

---

## 9. 필요한 환경 변수

```env
# .env.local
TAVILY_API_KEY=tvly-xxxxx
```

---

## 10. 참고 자료

- [Tavily AI Search API](https://tavily.com/)
- [WebContainer API Docs](https://webcontainers.io/api)
- 기존 구현: `AgentChat.tsx`, `streaming-parser.ts`
