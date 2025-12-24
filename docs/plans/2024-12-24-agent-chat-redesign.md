# Agent Chat 입력창 리디자인 설계

> **작성일**: 2024-12-24  
> **상태**: 승인됨

---

## 1. 개요

기존 Agent Chat의 간단한 입력창을 풍부한 기능을 갖춘 입력 인터페이스로 확장합니다.

### 주요 기능
- **모드 토글**: Spec (계획적 접근) / Fast (즉시 실행)
- **파일 업로드**: 이미지 첨부 (+)
- **명령어 팔레트**: /image 명령어 (/)
- **멘션 시스템**: 파일, 페이지 참조 (@)
- **모델 선택**: Gemini, Claude, GPT-4 전환
- **FloatingAIInput 연동**: Canvas 선택 → 채팅 통합

---

## 2. UI 구조

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┬──────────┐                                │
│  │   Spec   │   Fast   │  ← 모드 토글                    │
│  └──────────┴──────────┘                                │
│                                                         │
│  What do you want to build?                             │
│  ___________________________________________________    │
│                                                         │
│  ┌───┐  /   @   ┌─────────────┐           ┌───┐        │
│  │ + │          │ 🅖 Gemini ▼ │           │ ↑ │        │
│  └───┘          └─────────────┘           └───┘        │
└─────────────────────────────────────────────────────────┘
```

### 구성 요소

| 요소 | 기능 |
|------|------|
| **Spec/Fast 토글** | 모드 전환 |
| **+ 버튼** | 이미지 파일 업로드 |
| **/ 버튼** | 명령어 팔레트 |
| **@ 버튼** | 파일/페이지 멘션 |
| **모델 선택기** | AI 모델 드롭다운 |
| **전송 버튼** | 메시지 전송 |

---

## 3. Spec 모드 워크플로우

### 3단계 프로세스

```
Requirements → Implement Plan → Task
   (수집)           (계획)        (실행)
```

### 3.1 Requirements (요구사항 수집)

**목적**: 추상적인 요청을 구체적인 요구사항으로 변환

**AI 동작**:
- 요청이 추상적이면 구체적인 질문
- 한 번에 하나의 질문만
- 모든 것이 명확해지면 문서화

**출력**: `docs/requirements/YYYY-MM-DD-[topic].md`

### 3.2 Implement Plan (구현 계획)

**목적**: 요구사항 기반 기술 계획 수립

**AI 동작**:
- requirements 문서 참조
- 기존 docs (ARCHITECTURE, MECHANICS) 참조
- 아키텍처, 컴포넌트, 데이터 흐름 설계

**출력**: `docs/plans/YYYY-MM-DD-[topic]-design.md`

**사용자 승인 필요**

### 3.3 Task (작업 실행)

**목적**: 계획을 실행 가능한 체크리스트로 변환

**구조**:
```markdown
## Phase 1: 기본 구조
- [ ] Task 1.1
- [ ] Task 1.2

## Phase 2: 핵심 기능
- [ ] Task 2.1
```

**동작**: Phase 선택 → Start Task → 자동 실행

---

## 4. Fast 모드

계획 없이 즉시 구현합니다.

**AI 동작**:
- 사용자 요청 즉시 코드 생성
- 기존 문서 (ARCHITECTURE, MECHANICS) 참조
- Artifact 형식으로 파일 생성

---

## 5. 멘션 시스템

### `@` 자동완성

**트리거**: `@` 입력 시 드롭다운 표시

**항목 유형**:
- 📄 파일 (index.html, styles.css)
- 📁 폴더 (components/)
- 🌐 페이지 (Home, About)

**UI**:
```
┌────────────────────────────┐
│ 🔍 Search files & pages... │
├────────────────────────────┤
│ 📄 index.html              │
│ 📁 components/             │
│ 🌐 Home (/)                │
└────────────────────────────┘
```

---

## 6. 명령어 팔레트

### `/` 명령어

| 명령어 | 설명 |
|--------|------|
| `/image` | 이미지 생성 |

**UI**:
```
┌────────────────────────────┐
│ 🖼️ /image                  │
│    이미지를 생성합니다       │
└────────────────────────────┘
```

---

## 7. FloatingAIInput 연동

### 데이터 흐름

1. Canvas에서 요소 선택
2. FloatingAIInput에 입력
3. ChatStore에 메시지 + 요소 컨텍스트 전송
4. AI API 호출
5. AgentChat에 결과 표시

### ChatMessage 확장

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: {
    type: 'element-selection';
    element: SelectedElementInfo;
  };
  attachments?: {
    files: File[];
    mentions: MentionItem[];
  };
}
```

---

## 8. 프롬프트 엔지니어링

### Spec 모드 - Requirements

```
당신은 Vibric의 요구사항 분석가입니다.

## 규칙
1. 추상적인 요청 → 구체적인 질문으로 명확화
2. 한 번에 하나의 질문만
3. 모든 것이 명확해지면 문서화
4. 문서 저장 후 사용자 확인 요청

## 문서 형식
# [프로젝트명] 요구사항
## 목적
## 타겟 사용자
## 필수 기능
## 디자인 요구사항
## 기술 제약
```

### Spec 모드 - Implement Plan

```
당신은 구현 계획을 수립하는 시니어 아키텍트입니다.

## 참조 의무
- docs/requirements/[현재 프로젝트].md
- docs/ARCHITECTURE.md
- docs/MECHANICS.md

## 출력
아키텍처, 컴포넌트 구조, 데이터 흐름, API 설계
```

### Fast 모드

```
당신은 Vibric의 풀스택 개발자입니다.

## 규칙
1. 요청을 즉시 코드로 구현
2. <boltArtifact> 형식 사용
3. 기존 문서 참조하여 일관성 유지

## 참조
- docs/ARCHITECTURE.md
- docs/MECHANICS.md
- docs/DESIGN_SYSTEM.md
```

---

## 9. 구현 계획

### Phase 1: 입력창 UI 리디자인
- ChatInput 컴포넌트 재설계
- Spec/Fast 모드 토글
- 기본 레이아웃

### Phase 2: 멘션 & 명령어 시스템
- @ 자동완성 드롭다운
- / 명령어 팔레트
- 파일/페이지 데이터 연동

### Phase 3: 모델 선택 & 파일 업로드
- AI 모델 드롭다운
- + 버튼 이미지 업로드

### Phase 4: Spec 모드 워크플로우
- Requirements 수집 로직
- Implement Plan 생성
- Task 체크리스트 UI

### Phase 5: FloatingAIInput 연동
- ChatStore 메시지 통합
- 컨텍스트 자동 첨부

---

**문서 끝**
