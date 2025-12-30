"""
Orchestrator Node - 멀티 에이전트 지휘자

LLM 기반 동적 라우팅 및 품질 루프 관리
"""

import json
import re
from typing import Dict, Any, Optional, Literal
from datetime import datetime

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from agents.state import (
    AgentState, 
    ExecutionPlan, 
    ExecutionStep,
    QualityCheck,
    AgentError,
    should_continue_iteration,
    get_failed_quality_checks
)
from agents.registry import AGENT_REGISTRY, get_agent_names
from agents.utils.llm_factory import get_orchestrator_llm
from agents.prompts.orchestrator import (
    ORCHESTRATOR_SYSTEM_PROMPT,
    CREATE_PLAN_PROMPT,
    DECIDE_NEXT_STEP_PROMPT
)


def extract_json_from_response(response: str) -> Optional[Dict]:
    """LLM 응답에서 JSON 추출"""
    # 코드 블록 내 JSON 추출 시도
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    # 전체 응답에서 JSON 객체 추출 시도
    try:
        # { }로 시작하는 JSON 찾기
        start = response.find('{')
        end = response.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(response[start:end])
    except json.JSONDecodeError:
        pass
    
    return None


def get_user_request(state: AgentState) -> str:
    """사용자 요청 추출"""
    for msg in state.get("messages", []):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


def get_artifacts_summary(state: AgentState) -> str:
    """산출물 요약"""
    artifacts = state.get("artifacts", {})
    if not artifacts:
        return "아직 생성된 산출물 없음"
    
    lines = []
    for path, artifact in artifacts.items():
        lines.append(f"- {path} ({artifact['type']}, v{artifact['version']}) by {artifact['created_by']}")
    return "\n".join(lines)


def get_quality_check_summary(state: AgentState) -> str:
    """품질 검증 요약"""
    quality_checks = state.get("quality_checks", [])
    if not quality_checks:
        return "아직 품질 검증 없음"
    
    latest = quality_checks[-1]
    status = "✅ 통과" if latest["passed"] else "❌ 실패"
    issues = ", ".join(latest["issues"][:3]) if latest["issues"] else "없음"
    return f"{status} (검증자: {latest['checker']}, 이슈: {issues})"


def get_completed_steps_summary(state: AgentState) -> str:
    """완료된 단계 요약"""
    execution_plan = state.get("execution_plan")
    if not execution_plan:
        return "실행 계획 없음"
    
    steps = execution_plan.get("steps", [])
    completed = [s for s in steps if s.get("completed", False)]
    return f"{len(completed)}/{len(steps)} 단계 완료"


def create_execution_plan(state: AgentState) -> Dict[str, Any]:
    """실행 계획 생성"""
    llm = get_orchestrator_llm()
    
    # 프롬프트 구성
    system_prompt = ORCHESTRATOR_SYSTEM_PROMPT.format(
        agent_registry=AGENT_REGISTRY.get_registry_description()
    )
    
    user_request = get_user_request(state)
    project_context = state.get("project_context") or {}
    
    plan_prompt = CREATE_PLAN_PROMPT.format(
        user_request=user_request,
        project_context=json.dumps(project_context, ensure_ascii=False) if project_context else "없음"
    )
    
    # LLM 호출
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=plan_prompt)
    ]
    
    response = llm.invoke(messages)
    plan_json = extract_json_from_response(response.content)
    
    if not plan_json:
        # 파싱 실패 시 기본 계획
        plan_json = {
            "goal": user_request,
            "required_agents": ["planner", "coder", "reviewer"],
            "steps": [
                {"step_number": 1, "agent": "planner", "instruction": user_request, "expected_output": "기획안"},
                {"step_number": 2, "agent": "coder", "instruction": "기획안에 따라 코드 작성", "expected_output": "코드"},
                {"step_number": 3, "agent": "reviewer", "instruction": "코드 검토", "expected_output": "리뷰"}
            ]
        }
    
    # ExecutionPlan 생성
    execution_plan: ExecutionPlan = {
        "goal": plan_json.get("goal", user_request),
        "required_agents": plan_json.get("required_agents", []),
        "steps": [
            ExecutionStep(
                step_number=step.get("step_number", i+1),
                agent=step.get("agent", ""),
                instruction=step.get("instruction", ""),
                expected_output=step.get("expected_output", ""),
                completed=False
            )
            for i, step in enumerate(plan_json.get("steps", []))
        ],
        "created_at": datetime.now().isoformat()
    }
    
    # 첫 번째 에이전트로 라우팅
    first_agent = execution_plan["steps"][0]["agent"] if execution_plan["steps"] else "finish"
    
    return {
        "execution_plan": execution_plan,
        "current_step": 1,  # 첫 번째 단계 시작 (0은 아직 시작 안 함)
        "next_agent": first_agent,
        "messages": [AIMessage(content=f"실행 계획 생성 완료: {execution_plan['goal']}")]
    }


def decide_next_step(state: AgentState) -> Dict[str, Any]:
    """다음 단계 결정"""
    
    iteration_count = state.get("iteration_count", 0)
    max_iterations = state.get("max_iterations", 5)  # 유저 피드백 최대 5회
    current_step = state.get("current_step", 0)
    
    # === 무한 루프 방지 체크 ===
    
    # 1. 최대 반복 횟수 초과
    if iteration_count >= max_iterations:
        print(f"[ORCHESTRATOR] ⚠️ 최대 반복 횟수({max_iterations}회) 도달. 강제 종료.")
        return {
            "next_agent": "finish",
            "messages": [AIMessage(content=f"⚠️ 최대 반복 횟수({max_iterations}회)에 도달했습니다. 현재까지의 결과로 작업을 완료합니다.")]
        }
    
    # 2. 총 단계 수 제한 (API 비용 보호)
    MAX_TOTAL_STEPS = 15
    if current_step >= MAX_TOTAL_STEPS:
        print(f"[ORCHESTRATOR] ⚠️ 총 단계 수({MAX_TOTAL_STEPS}) 초과. 강제 종료.")
        return {
            "next_agent": "finish",
            "messages": [AIMessage(content=f"⚠️ 총 단계 수({MAX_TOTAL_STEPS})를 초과했습니다. 현재까지의 결과로 작업을 완료합니다.")]
        }
    
    print(f"[ORCHESTRATOR] 상태: iteration={iteration_count}/{max_iterations}, step={current_step}/{MAX_TOTAL_STEPS}")
    
    # === 테스트 모드: 실행 계획 단계 우선 따르기 ===
    # iteration_count가 0이면 아직 첫 번째 사이클 중이므로 실행 계획 따르기
    plan = state.get("execution_plan")
    if iteration_count == 0 and plan:
        steps = plan.get("steps", [])
        if current_step < len(steps):
            next_step = steps[current_step]
            next_agent = next_step["agent"]
            print(f"[ORCHESTRATOR] 실행 계획 따르기: step {current_step + 1}/{len(steps)} → {next_agent}")
            return {
                "next_agent": next_agent,
                "current_step": current_step + 1,
                "messages": [AIMessage(content=f"[계획] {next_step.get('instruction', next_agent + ' 작업 수행')}")]
            }
        else:
            # 모든 단계 완료
            print(f"[ORCHESTRATOR] 모든 실행 계획 단계 완료. finish로 이동")
            return {
                "next_agent": "finish",
                "messages": [AIMessage(content="✅ 모든 계획된 작업이 완료되었습니다.")]
            }
    
    # iteration_count > 0이면 리뷰/수정 사이클 중 - LLM 판단 사용
    llm = get_orchestrator_llm()
    
    # 프롬프트 구성
    system_prompt = ORCHESTRATOR_SYSTEM_PROMPT.format(
        agent_registry=AGENT_REGISTRY.get_registry_description()
    )
    
    execution_plan = state.get("execution_plan")
    goal = execution_plan["goal"] if execution_plan else get_user_request(state)
    
    # 최근 에이전트 결과 요약
    msgs = state.get("messages", [])
    recent_messages = msgs[-5:] if len(msgs) > 5 else msgs
    agent_results = "\n".join([
        f"- {msg.content[:200]}..." if len(msg.content) > 200 else f"- {msg.content}"
        for msg in recent_messages if isinstance(msg, AIMessage)
    ])
    
    decide_prompt = DECIDE_NEXT_STEP_PROMPT.format(
        goal=goal,
        completed_steps=get_completed_steps_summary(state),
        artifacts_summary=get_artifacts_summary(state),
        quality_check_summary=get_quality_check_summary(state),
        iteration_count=iteration_count,
        max_iterations=max_iterations,
        agent_results=agent_results or "아직 없음"
    )
    
    # LLM 호출
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=decide_prompt)
    ]
    
    response = llm.invoke(messages)
    decision = extract_json_from_response(response.content)
    
    if not decision:
        # 파싱 실패 시 현재 단계 기반으로 결정
        current_step = state.get("current_step", 0)
        plan = state.get("execution_plan")
        
        print(f"[ORCHESTRATOR] JSON 파싱 실패. current_step={current_step}, plan에 {len(plan.get('steps', [])) if plan else 0}개 단계")
        
        if plan and current_step < len(plan.get("steps", [])):
            next_step = plan["steps"][current_step]
            print(f"[ORCHESTRATOR] 다음 단계: {next_step['agent']} (step {current_step + 1})")
            return {
                "next_agent": next_step["agent"],
                "current_step": current_step + 1,
                "messages": [AIMessage(content=f"[자동] {next_step['agent']} 에이전트 호출")]
            }
        else:
            print(f"[ORCHESTRATOR] 모든 단계 완료. finish로 이동")
            return {"next_agent": "finish"}
    
    # 결정에 따른 처리
    action = decision.get("action", "finish")
    
    if action == "call_agent":
        agent_name = decision.get("agent", "coder")
        if agent_name not in get_agent_names():
            agent_name = "coder"  # 폴백
        
        return {
            "next_agent": agent_name,
            "current_step": state.get("current_step", 0) + 1,
            "messages": [AIMessage(content=f"[Orchestrator] {agent_name} 에이전트 호출: {decision.get('instruction', '')}")]
        }
    
    elif action == "verify":
        checker = decision.get("checker", "reviewer")
        return {
            "next_agent": checker,
            "messages": [AIMessage(content=f"[Orchestrator] 품질 검증 요청: {decision.get('target', '')}")]
        }
    
    elif action == "refine":
        # refine 요청 시 반복 횟수 추가 체크
        new_iteration = iteration_count + 1
        if new_iteration >= max_iterations:
            print(f"[ORCHESTRATOR] ⚠️ refine 요청이지만 반복 횟수 초과. 현재 결과로 종료.")
            return {
                "next_agent": "finish",
                "iteration_count": new_iteration,
                "messages": [AIMessage(content=f"⚠️ 추가 수정이 필요하지만 반복 횟수({max_iterations}회)에 도달했습니다. 현재 결과로 완료합니다.")]
            }
        
        agent_name = decision.get("agent", "coder")
        print(f"[ORCHESTRATOR] refine 요청: {agent_name} (iteration {new_iteration}/{max_iterations})")
        return {
            "next_agent": agent_name,
            "iteration_count": new_iteration,
            "current_step": current_step + 1,
            "messages": [AIMessage(content=f"[Orchestrator] 수정 요청 ({new_iteration}/{max_iterations}회): {decision.get('feedback', '')}")]
        }
    
    else:  # finish
        return {
            "next_agent": "finish",
            "messages": [AIMessage(content=f"[Orchestrator] 작업 완료: {decision.get('summary', '모든 작업이 완료되었습니다.')}")]
        }


def orchestrator_node(state: AgentState) -> Dict[str, Any]:
    """
    Orchestrator 메인 노드
    
    1. 실행 계획이 없으면 계획 생성
    2. 계획이 있으면 다음 단계 결정
    """
    print(f"\n[ORCHESTRATOR] 상태 분석 중...")
    print(f"  - 메시지 수: {len(state.get('messages', []))}")
    print(f"  - 실행 계획: {'있음' if state.get('execution_plan') else '없음'}")
    print(f"  - 현재 단계: {state.get('current_step', 0)}")
    print(f"  - 반복 횟수: {state.get('iteration_count', 0)}")
    
    try:
        if state.get("execution_plan") is None:
            print("[ORCHESTRATOR] 실행 계획 생성 중...")
            result = create_execution_plan(state)
            print(f"[ORCHESTRATOR] 계획 생성 완료. 첫 에이전트: {result.get('next_agent')}")
        else:
            print("[ORCHESTRATOR] 다음 단계 결정 중...")
            result = decide_next_step(state)
            print(f"[ORCHESTRATOR] 결정 완료. 다음 에이전트: {result.get('next_agent')}")
        
        return result
        
    except Exception as e:
        print(f"[ORCHESTRATOR] 에러 발생: {e}")
        error = AgentError(
            agent="orchestrator",
            error_type=type(e).__name__,
            message=str(e),
            recoverable=True,
            occurred_at=datetime.now().isoformat()
        )
        return {
            "errors": state.get("errors", []) + [error],
            "next_agent": "finish",
            "messages": [AIMessage(content=f"[Orchestrator] 에러 발생: {e}")]
        }


def route_from_orchestrator(state: AgentState) -> str:
    """Orchestrator 라우팅 함수"""
    next_agent = state.get("next_agent", "finish")
    
    valid_agents = get_agent_names() + ["finish"]
    if next_agent not in valid_agents:
        print(f"[ROUTER] 알 수 없는 에이전트: {next_agent}, finish로 폴백")
        return "finish"
    
    print(f"[ROUTER] 라우팅: {next_agent}")
    return next_agent
