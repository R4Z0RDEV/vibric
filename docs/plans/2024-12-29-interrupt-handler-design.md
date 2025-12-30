# 유저 중간 수정 요청 처리 설계

## 개요

멀티 에이전트 파이프라인 실행 중 유저가 수정 요청을 하면, 이를 자연스럽게 처리하는 Interrupt Handler 시스템.

## 요구사항

- **모든 시점 대응**: 에이전트 작업 중, 완료 후, 파이프라인 완료 후 모두
- **상황별 처리**: 수정 범위에 따라 리셋/증분 결정
- **LLM + 유저 확인**: 확실하면 자동, 불확실하면 유저에게 물어보기

## 아키텍처

```
[유저 메시지] → route_entry 판단
  ├─ 첫 요청 → orchestrator (기존 흐름)
  └─ 수정 요청 → interrupt_handler
       ├─ RESET → state 초기화 → orchestrator
       ├─ MODIFY → 해당 agent로 직접 이동
       └─ APPEND → orchestrator (추가 계획)
```

## 구현 상세

### 1. 새 파일: `agents/interrupt_handler.py`

```python
class ModificationScope(Enum):
    RESET = "reset"    # 전체 리셋
    MODIFY = "modify"  # 부분 수정
    APPEND = "append"  # 추가 작업

@dataclass
class InterruptDecision:
    scope: ModificationScope
    confidence: float           # 0.0 ~ 1.0
    affected_agents: List[str]  # ["coder", "reviewer"]
    reason: str

def analyze_user_interrupt(
    user_message: str,
    current_state: AgentState
) -> InterruptDecision:
    """유저 수정 요청 분석 (LLM 판단)"""
    # confidence >= 0.8 → 자동 결정
    # confidence < 0.8 → 유저에게 확인
```

### 2. LangGraph 통합: `agent_graph.py`

```python
def route_entry(state: AgentState) -> str:
    last_msg = state.messages[-1] if state.messages else None
    
    # 유저 메시지 + 이미 실행 중인 파이프라인
    if isinstance(last_msg, HumanMessage) and state.execution_plan:
        return "interrupt_handler"
    return "orchestrator"

workflow.add_conditional_edges(START, route_entry, {...})
```

### 3. 유저 확인 UI (confidence < 0.8)

```json
{
  "type": "interrupt_confirmation",
  "options": [
    {"id": "reset", "label": "처음부터 다시"},
    {"id": "modify", "label": "해당 부분만 수정"},
    {"id": "cancel", "label": "취소"}
  ]
}
```

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 실행 중 인터럽트 | 현재 에이전트 완료 후 처리 |
| 유저 타임아웃 | 기본값 APPEND |
| LLM 실패 | 유저에게 직접 선택 요청 |

## 구현 순서

1. `ModificationScope` enum 및 `InterruptDecision` dataclass 정의
2. `interrupt_handler_node` 구현
3. `agent_graph.py`에 `route_entry` 라우팅 추가
4. 프론트엔드 확인 UI 구현 (선택적)
