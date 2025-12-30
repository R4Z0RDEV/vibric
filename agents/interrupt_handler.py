"""
Interrupt Handler - 유저 중간 수정 요청 처리

유저가 파이프라인 실행 중 수정 요청을 하면 이를 분석하고 적절한 액션을 결정.
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from agents.state import AgentState, ModificationContext
from agents.utils.llm_factory import get_orchestrator_llm


# === 타입 정의 ===

class ModificationScope(Enum):
    """수정 범위"""
    RESET = "reset"    # 전체 리셋 - 기존 artifacts 초기화 후 새로 시작
    MODIFY = "modify"  # 부분 수정 - 해당 부분만 수정
    APPEND = "append"  # 추가 작업 - 기존 유지 + 추가 작업


@dataclass
class InterruptDecision:
    """인터럽트 결정 결과"""
    scope: ModificationScope
    confidence: float           # 0.0 ~ 1.0 (0.8 이상이면 자동 결정)
    affected_agents: List[str]  # 영향받는 에이전트 목록
    reason: str                 # 결정 이유
    new_instruction: str        # 새 지시사항


# === 분석 프롬프트 ===

INTERRUPT_ANALYSIS_PROMPT = """유저가 진행 중인 작업에 수정 요청을 했습니다. 분석하세요.

## 현재 상태
- 목표: {goal}
- 진행 단계: {current_step}/{total_steps}
- 생성된 파일: {artifacts}

## 유저 요청
"{user_message}"

## 판단 기준
- RESET: "처음부터", "다시", "취소", "다른 걸로" 등 완전히 새로운 작업
- MODIFY: "수정", "변경", "바꿔", "색상", "크기" 등 부분 수정
- APPEND: "추가", "더", "그리고" 등 기존 유지 + 추가

## 출력 (JSON)
{{
  "scope": "reset|modify|append",
  "confidence": 0.0-1.0,
  "affected_agents": ["agent1"],
  "reason": "한 줄 이유",
  "new_instruction": "수정된 지시사항"
}}"""


# === 분석 함수 ===

def analyze_user_interrupt(
    user_message: str,
    state: AgentState
) -> InterruptDecision:
    """유저 수정 요청 분석"""
    
    llm = get_orchestrator_llm()
    
    # 현재 상태 추출
    execution_plan = state.get("execution_plan")
    goal = execution_plan["goal"] if execution_plan else "알 수 없음"
    steps = execution_plan.get("steps", []) if execution_plan else []
    current_step = state.get("current_step", 0)
    artifacts = list(state.get("artifacts", {}).keys())
    
    # 프롬프트 구성
    prompt = INTERRUPT_ANALYSIS_PROMPT.format(
        goal=goal,
        current_step=current_step,
        total_steps=len(steps),
        artifacts=artifacts or "없음",
        user_message=user_message
    )
    
    messages = [
        SystemMessage(content="당신은 유저 요청 분석기입니다. JSON으로만 응답하세요."),
        HumanMessage(content=prompt)
    ]
    
    response = llm.invoke(messages)
    
    # JSON 파싱
    import json
    import re
    
    try:
        # JSON 추출
        json_match = re.search(r'\{[^{}]*\}', response.content, re.DOTALL)
        if json_match:
            decision_data = json.loads(json_match.group())
        else:
            raise ValueError("No JSON found")
        
        return InterruptDecision(
            scope=ModificationScope(decision_data.get("scope", "append")),
            confidence=float(decision_data.get("confidence", 0.5)),
            affected_agents=decision_data.get("affected_agents", ["coder"]),
            reason=decision_data.get("reason", "알 수 없음"),
            new_instruction=decision_data.get("new_instruction", user_message)
        )
    except Exception as e:
        print(f"[INTERRUPT] 파싱 실패: {e}. 기본값 APPEND 사용")
        return InterruptDecision(
            scope=ModificationScope.APPEND,
            confidence=0.5,
            affected_agents=["coder"],
            reason="파싱 실패로 기본값 사용",
            new_instruction=user_message
        )


# === 타겟 파일 식별 ===

def identify_target_files(
    user_message: str, 
    artifacts: Dict[str, Any]
) -> List[str]:
    """
    수정 대상 파일 추론
    
    키워드 기반 매핑 + 존재하는 artifact만 반환
    """
    # 키워드 매핑: 키워드 -> 우선순위 파일 리스트
    keyword_mapping = {
        # 코드 관련
        "버튼": ["code.tsx"],
        "색상": ["code.tsx"],
        "스타일": ["code.tsx"],
        "디자인": ["code.tsx"],
        "UI": ["code.tsx"],
        "컴포넌트": ["code.tsx"],
        "함수": ["code.tsx"],
        "레이아웃": ["code.tsx"],
        # 기획 관련
        "기획": ["plan.md"],
        "요구사항": ["plan.md"],
        "스펙": ["plan.md"],
        # 테스트 관련
        "테스트": ["test.ts"],
        "검증": ["test.ts"],
    }
    
    target_files = []
    message_lower = user_message.lower()
    
    for keyword, files in keyword_mapping.items():
        if keyword in user_message or keyword.lower() in message_lower:
            for f in files:
                if f in artifacts and f not in target_files:
                    target_files.append(f)
    
    # 기본값: 코드 파일이 있으면 코드, 없으면 모든 artifact
    if not target_files:
        if "code.tsx" in artifacts:
            target_files = ["code.tsx"]
        else:
            target_files = list(artifacts.keys())
    
    return target_files


# === 노드 ===

def interrupt_handler_node(state: AgentState) -> Dict[str, Any]:
    """
    Interrupt Handler 노드
    
    유저의 중간 수정 요청을 처리하고 적절한 액션을 결정합니다.
    """
    print("\n[INTERRUPT] 유저 수정 요청 감지...")
    
    # 마지막 유저 메시지 추출
    messages = state.get("messages", [])
    user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            user_message = msg.content
            break
    
    if not user_message:
        print("[INTERRUPT] 유저 메시지 없음. orchestrator로 이동")
        return {"next_agent": "orchestrator"}
    
    # 분석
    decision = analyze_user_interrupt(user_message, state)
    print(f"[INTERRUPT] 결정: {decision.scope.value} (confidence: {decision.confidence})")
    
    # TODO: confidence < 0.8이면 유저에게 확인 요청 (프론트엔드 연동 필요)
    # 현재는 자동으로 처리
    
    # 결정에 따른 처리
    artifacts = state.get("artifacts", {})
    original_goal = state.get("execution_plan", {}).get("goal", "") if state.get("execution_plan") else ""
    
    if decision.scope == ModificationScope.RESET:
        print("[INTERRUPT] RESET - 전체 초기화 후 새 계획 생성")
        
        # RESET도 modification_context 설정 (원래 목표 유지)
        mod_context: ModificationContext = {
            "type": "reset",
            "instruction": decision.new_instruction,
            "target_files": [],
            "original_goal": original_goal
        }
        
        return {
            "next_agent": "orchestrator",
            "execution_plan": None,  # 계획 초기화
            "artifacts": {},         # 산출물 초기화
            "current_step": 0,
            "iteration_count": 0,
            "modification_context": mod_context,
            "messages": [
                AIMessage(content=f"[Interrupt] 기존 작업을 초기화하고 새로 시작합니다: {decision.new_instruction}")
            ]
        }
    
    elif decision.scope == ModificationScope.MODIFY:
        print(f"[INTERRUPT] MODIFY - {decision.affected_agents}로 수정 요청")
        target_agent = decision.affected_agents[0] if decision.affected_agents else "coder"
        target_files = identify_target_files(user_message, artifacts)
        
        print(f"[INTERRUPT] 수정 대상 파일: {target_files}")
        
        mod_context: ModificationContext = {
            "type": "modify",
            "instruction": decision.new_instruction,
            "target_files": target_files,
            "original_goal": original_goal
        }
        
        return {
            "next_agent": target_agent,
            "iteration_count": state.get("iteration_count", 0) + 1,
            "modification_context": mod_context,
            "messages": [
                AIMessage(content=f"[Interrupt] 수정 요청: {decision.new_instruction} (대상: {', '.join(target_files)})")
            ]
        }
    
    else:  # APPEND
        print("[INTERRUPT] APPEND - 기존 유지 + 추가 작업")
        target_files = identify_target_files(user_message, artifacts)
        
        mod_context: ModificationContext = {
            "type": "append",
            "instruction": decision.new_instruction,
            "target_files": target_files,
            "original_goal": original_goal
        }
        
        return {
            "next_agent": "orchestrator",
            "modification_context": mod_context,
            "messages": [
                AIMessage(content=f"[Interrupt] 추가 작업 요청: {decision.new_instruction}")
            ]
        }
