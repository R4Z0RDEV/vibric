# 코드 에디터 및 터미널 개선 설계

## 개요
코드 에디터의 파일 트리, 터미널 시스템, 액션 로그 클릭 기능을 개선합니다.

| 기능 | 선택 |
|------|------|
| 파일 트리 | 하이브리드 - 템플릿 + AI 생성 파일 |
| 터미널 | 사용자 입력 + AI 자동 실행 |
| 액션 로그 클릭 | Code 탭 전환 + 파일 열기 |

---

## 1. 파일 트리 개선

### 수정 파일
- `src/lib/webcontainer-templates.ts` - 전체 프로젝트 구조 템플릿
- `src/components/shell/AgentChat.tsx` - 중첩 파일 추가 로직

### 구현
```typescript
// webcontainer-templates.ts
export const defaultFileNodes: FileNode[] = [
    {
        name: 'src',
        path: 'src',
        type: 'directory',
        isOpen: true,
        children: [
            { name: 'components', path: 'src/components', type: 'directory', children: [] },
            { name: 'pages', path: 'src/pages', type: 'directory', children: [] },
        ],
    },
    { name: 'package.json', path: 'package.json', type: 'file', content: '...' },
    // ...
];
```

### 유틸 함수
`addFileToTree(files, path, content)` - 경로에 따라 적절한 디렉토리에 중첩 추가

---

## 2. 터미널 시스템

### 새 파일
- `src/components/editor/Terminal.tsx` - xterm.js 통합 터미널

### 수정 파일
- `src/stores/webcontainer-store.ts` - spawnShell, sendInput 추가
- `src/lib/streaming-parser.ts` - run_command 액션 파싱

### 지원 명령어
- `npm install <package>`
- `npm run dev/build/test`
- `node <script.js>`
- `npx prettier --write .`
- 기본 셸 명령어 (ls, cat, echo)

### AI 명령어 실행
```xml
<action type="run_command" command="npm install lodash" />
```

---

## 3. 액션 로그 클릭

### 수정 파일
- `src/components/chat/ActionLog.tsx`

### 구현
```typescript
const handleClick = () => {
    setActiveTab('code');  // Code 탭 전환
    openFile(action.path); // 파일 열기
};
```

### 스타일
- `cursor-pointer hover:bg-white/10 active:scale-[0.98]`

---

## 구현 순서
1. 파일 트리 템플릿 확장 + 중첩 파일 추가 로직
2. 액션 로그 클릭 기능
3. 터미널 컴포넌트 (xterm.js 통합)
4. AI 명령어 실행 연동
