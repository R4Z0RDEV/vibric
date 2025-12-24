# AI Thinking UI & Action Logs 설계

> AI의 사고 과정("Thought for Xs")과 실시간 액션 로그를 표시하는 기능

## 개요

Claude/Cursor 스타일의 AI 응답 UI를 구현합니다:
- **Thinking Block**: AI의 내부 추론 과정을 접기/펼치기로 표시
- **Action Logs**: 파일 생성/수정 등의 행동을 실시간으로 표시

## 기술적 결정

| 항목 | 결정 |
|------|------|
| AI 모델 | Gemini 3.0 Pro (`thinkingLevel: high`) |
| 데이터 방식 | AI 응답 XML 파싱 |
| 파일 시스템 | 기존 WebContainer 연동 |

---

## AI 응답 형식

```xml
<boltResponse>
  <thinking>
    <step title="Analyzing requirements">
      사용자가 버튼 컴포넌트를 요청했습니다...
    </step>
    <step title="Designing component">
      Tailwind CSS를 사용한 모던한 디자인...
    </step>
  </thinking>
  
  <actions>
    <action type="create_file" path="/src/components/Button.tsx">
      // 코드 내용
    </action>
    <action type="modify_file" path="/src/App.tsx" lines="+5">
      // 수정된 코드
    </action>
  </actions>
  
  <message>
    버튼 컴포넌트를 생성했습니다.
  </message>
</boltResponse>
```

---

## 새로 만들 파일

### UI 컴포넌트

| 파일 | 설명 |
|------|------|
| `src/components/chat/ThinkingBlock.tsx` | "Thought for Xs" 접기/펼치기 UI |
| `src/components/chat/ActionLog.tsx` | 개별 액션 로그 아이템 |
| `src/components/chat/ActionLogList.tsx` | 액션 로그 리스트 컨테이너 |

### 유틸리티

| 파일 | 설명 |
|------|------|
| `src/lib/streaming-parser.ts` | XML 태그 실시간 파싱 유틸 |

---

## 수정할 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/chat/route.ts` | Gemini 3.0 Pro + `thinkingLevel` 파라미터 |
| `src/stores/chat-store.ts` | `thinking`, `actions` 상태 추가 |
| `src/constants/prompts.ts` | 구조화된 XML 응답 시스템 프롬프트 |
| `src/components/shell/AgentChat.tsx` | 스트리밍 파서 연동, 새 UI 컴포넌트 렌더링 |

---

## 메시지 렌더링 구조

```
┌─ ThinkingBlock (접힌 상태) ─────────────┐
│  ⏱ Thought for 21s  >                  │
└────────────────────────────────────────┘
┌─ ActionLogList ────────────────────────┐
│  + Create component "Button"      ✔    │
│  📁 /src/Button.tsx (new) +45     ✔    │
│  📝 /src/App.tsx +3               ✔    │
└────────────────────────────────────────┘
┌─ Message ──────────────────────────────┐
│  버튼 컴포넌트를 생성했습니다...         │
└────────────────────────────────────────┘
```

---

## 구현 순서

### Phase 1: 기반 작업
- [ ] Gemini 3.0 Pro 모델 변경
- [ ] XML 응답 시스템 프롬프트 작성
- [ ] StreamingParser 유틸 구현

### Phase 2: UI 컴포넌트
- [ ] ThinkingBlock 컴포넌트
- [ ] ActionLog / ActionLogList 컴포넌트
- [ ] ChatStore 확장 (thinking, actions)

### Phase 3: 통합 및 검증
- [ ] AgentChat에 파서 + UI 연동
- [ ] WebContainer 파일 생성 연결
- [ ] 브라우저 E2E 테스트

---

## 검증 계획

1. AI에게 "버튼 컴포넌트 만들어줘" 요청
2. "Thought for Xs" 섹션이 표시되고 확장 가능한지 확인
3. Action Logs가 실시간으로 나타나는지 확인
4. WebContainer에 파일이 실제로 생성되는지 확인
