# 멀티 에이전트 시스템 프로덕션 레벨 리팩토링 설계

> **문서 버전**: 1.0  
> **작성일**: 2024-12-28  
> **목적**: 현재 단순 키워드 기반 멀티 에이전트 시스템을 대기업 수준의 프로덕션 레벨로 리팩토링

---

## 1. 현재 상태 분석

### 1.1 현재 구조의 문제점

| 문제 | 상세 |
|------|------|
| **라우팅이 단순함** | 키워드 매칭 방식, LLM 기반 의도 파악 없음 |
| **협업이 일방적** | PM → Coder → Reviewer → END, 피드백 루프 없음 |
| **상태 관리 부족** | `messages`와 `next_step`만 존재 |
| **에러 처리 없음** | API 실패 시 복구 불가 |
| **관측성 부족** | print 디버그만 존재 |

### 1.2 목표

- **품질 우선**: 빠른 생성보다 에러 없는 고품질 결과물
- **유기적 협업**: 에이전트 간 피드백 루프 + 품질 게이트
- **동적 에이전트**: 요청에 따라 필요한 에이전트만 활성화
- **프로덕션 안정성**: 에러 처리, 재시도, 모니터링

---

## 2. 아키텍처 설계

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. 사용자 요청 분석 (Intent Detection)                       ││
│  │ 2. 필요한 에이전트 선택 (Agent Selection)                     ││
│  │ 3. 실행 계획 생성 (Execution Plan)                           ││
│  │ 4. 에이전트 실행 및 결과 수집                                 ││
│  │ 5. 품질 검증 + 피드백 루프                                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT REGISTRY                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Planner │ │ Coder   │ │ Tester  │ │ Reviewer│ │ UX/UI   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                            │
│  │ Security│ │ DB Arch │ │ DevOps  │  ... (확장 가능)           │
│  └─────────┘ └─────────┘ └─────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 설계 원칙

1. **Dynamic Agent Orchestration**: LLM이 동적으로 에이전트 선택
2. **Quality Loop**: 검증 실패 시 자동 수정 사이클
3. **Agent Registry**: 확장 가능한 에이전트 카탈로그
4. **Structured State**: 풍부한 상태 관리

---

## 3. 상태 설계 (AgentState)

```python
class AgentState(TypedDict):
    # === 기본 대화 ===
    messages: Annotated[List[BaseMessage], add_messages]
    
    # === 실행 계획 ===
    execution_plan: Optional[ExecutionPlan]
    current_step: int
    
    # === 작업 산출물 ===
    artifacts: Dict[str, Artifact]
    
    # === 품질 추적 ===
    quality_checks: List[QualityCheck]
    iteration_count: int
    max_iterations: int  # 기본값: 5
    
    # === 컨텍스트 ===
    project_context: Optional[ProjectContext]
    user_preferences: Optional[Dict]
    
    # === 에러 처리 ===
    errors: List[AgentError]
    retry_count: int

class ExecutionPlan(TypedDict):
    goal: str
    required_agents: List[str]
    steps: List[ExecutionStep]

class Artifact(TypedDict):
    type: Literal["plan", "code", "test", "review"]
    content: str
    created_by: str
    version: int
    
class QualityCheck(TypedDict):
    checker: str
    passed: bool
    issues: List[str]
    suggestions: List[str]
```

---

## 4. Agent Registry 설계

### 4.1 에이전트 정의

```python
@dataclass
class AgentDefinition:
    name: str
    role: str
    capabilities: List[str]
    model: str
    system_prompt: str
```

### 4.2 초기 에이전트 목록

| 에이전트 | 역할 | 모델 | 능력 |
|---------|------|------|------|
| `planner` | 프로젝트 기획자 | gemini-2.5-pro | 요구사항 분석, 작업 분해 |
| `coder` | 시니어 개발자 | claude-3-5-sonnet | React/Next.js, TypeScript |
| `tester` | QA 엔지니어 | gpt-4o | 테스트 케이스, 엣지 케이스 |
| `reviewer` | 코드 리뷰어 | claude-3-5-sonnet | 품질, 보안, 성능 검토 |
| `ux_designer` | UX 디자이너 | gemini-2.5-pro | 와이어프레임, 접근성 |
| `security` | 보안 전문가 | gpt-4o | OWASP, 인증/인가 |

---

## 5. Orchestrator 설계

### 5.1 핵심 로직

```python
def orchestrator_node(state: AgentState) -> AgentState:
    # 첫 진입: 실행 계획 생성
    if state["execution_plan"] is None:
        return create_execution_plan(state)
    
    # 계획 실행 중: 다음 단계 결정
    return decide_next_step(state)
```

### 5.2 LLM 기반 라우팅

Orchestrator는 다음 JSON 형식으로 결정을 내림:

```json
{"action": "call_agent", "agent": "coder", "instruction": "..."}
{"action": "verify", "checker": "reviewer"}
{"action": "refine", "agent": "coder", "feedback": "..."}
{"action": "finish", "summary": "..."}
```

### 5.3 품질 루프

```
Orchestrator → Reviewer → [문제 발견] → Coder → Reviewer → [OK] → END
```

- `iteration_count`로 반복 횟수 추적
- `max_iterations` 도달 시 강제 종료

---

## 6. 디렉토리 구조

```
vibric-app/
├── agents/
│   ├── __init__.py
│   ├── graph.py              # 메인 그래프 정의
│   ├── state.py              # AgentState 및 타입들
│   ├── registry.py           # Agent Registry
│   ├── orchestrator.py       # Orchestrator 노드
│   ├── nodes/
│   │   ├── __init__.py
│   │   ├── planner.py
│   │   ├── coder.py
│   │   ├── tester.py
│   │   ├── reviewer.py
│   │   └── ux_designer.py
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── orchestrator.py
│   │   ├── planner.py
│   │   └── coder.py
│   └── utils/
│       ├── __init__.py
│       ├── llm_factory.py
│       ├── error_handling.py
│       └── observability.py
│
├── langgraph.json
├── .env
└── requirements.txt
```

---

## 7. 에러 처리 및 관측성

### 7.1 재시도 전략

```python
@with_retry(max_retries=3, backoff=1.0)
async def agent_node(state: AgentState) -> AgentState:
    ...
```

### 7.2 LangSmith 통합

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=vibric-agents
```

### 7.3 구조화 로깅

- `agent.started` - 에이전트 시작
- `agent.completed` - 에이전트 완료
- `quality.checked` - 품질 검증 결과
- `limit.reached` - 제한 도달

---

## 8. LangGraph 구현

### 8.1 그래프 정의

```python
def create_agent_graph():
    workflow = StateGraph(AgentState)
    
    # 노드 등록
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("planner", planner.node)
    workflow.add_node("coder", coder.node)
    workflow.add_node("tester", tester.node)
    workflow.add_node("reviewer", reviewer.node)
    workflow.add_node("ux_designer", ux_designer.node)
    
    # 진입점
    workflow.set_entry_point("orchestrator")
    
    # 동적 라우팅
    workflow.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "planner": "planner",
            "coder": "coder",
            "tester": "tester",
            "reviewer": "reviewer",
            "ux_designer": "ux_designer",
            "finish": END
        }
    )
    
    # 모든 에이전트 → Orchestrator로 복귀
    for agent in ["planner", "coder", "tester", "reviewer", "ux_designer"]:
        workflow.add_edge(agent, "orchestrator")
    
    return workflow.compile()
```

### 8.2 langgraph.json

```json
{
    "dependencies": ["."],
    "graphs": {
        "vibric_agent": "./agents/graph.py:app_graph"
    },
    "env": ".env"
}
```

---

## 9. 구현 우선순위

### Phase 1: 기반 구축 (Day 1-2)
- [ ] 디렉토리 구조 생성
- [ ] state.py 구현
- [ ] registry.py 구현
- [ ] llm_factory.py 구현

### Phase 2: Orchestrator (Day 3-5)
- [ ] orchestrator.py 구현
- [ ] 프롬프트 엔지니어링
- [ ] LangSmith 테스트

### Phase 3: 에이전트 노드 (Day 6-8)
- [ ] planner.py 구현
- [ ] coder.py 구현
- [ ] reviewer.py 구현
- [ ] tester.py 구현

### Phase 4: 품질 루프 (Day 9-10)
- [ ] 피드백 → 수정 → 재검증 사이클
- [ ] 무한 루프 방지
- [ ] 품질 게이트

### Phase 5: 안정화 (Day 11-12)
- [ ] 에러 처리 강화
- [ ] 관측성 개선
- [ ] E2E 테스트

---

## 10. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 품질 루프 | 없음 | 자동 수정 최대 5회 |
| 에러 복구율 | 0% | 90%+ |
| LangSmith 추적 | 없음 | 전체 추적 |
| 에이전트 확장성 | 3개 고정 | 동적 N개 |

---

**문서 끝**
