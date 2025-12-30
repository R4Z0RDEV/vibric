"""
메인 그래프 정의

LangGraph 워크플로우 구성
"""

from dotenv import load_dotenv
load_dotenv()  # .env 파일 로드

from langgraph.graph import StateGraph, END, START
from langchain_core.messages import HumanMessage

from agents.state import AgentState, create_initial_state
from agents.orchestrator import orchestrator_node, route_from_orchestrator
from agents.interrupt_handler import interrupt_handler_node
from agents.nodes.agents import (
    planner_node,
    coder_node,
    reviewer_node,
    tester_node,
    ux_designer_node,
    security_node,
    db_agent_node
)


def route_entry(state: AgentState) -> str:
    """
    진입점 라우팅
    
    - 첫 요청: orchestrator
    - 수정 요청 (execution_plan 존재): interrupt_handler
    """
    messages = state.get("messages", [])
    execution_plan = state.get("execution_plan")
    
    if not messages:
        return "orchestrator"
    
    last_msg = messages[-1] if messages else None
    
    # 유저 메시지 + 이미 실행 중인 파이프라인이 있으면
    if isinstance(last_msg, HumanMessage) and execution_plan:
        print("[ROUTER] 유저 수정 요청 감지 → interrupt_handler")
        return "interrupt_handler"
    
    return "orchestrator"


def create_agent_graph():
    """멀티 에이전트 그래프 생성"""
    
    workflow = StateGraph(AgentState)
    
    # === 노드 등록 ===
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("interrupt_handler", interrupt_handler_node)  # 새 노드
    workflow.add_node("planner", planner_node)
    workflow.add_node("coder", coder_node)
    workflow.add_node("reviewer", reviewer_node)
    workflow.add_node("tester", tester_node)
    workflow.add_node("ux_designer", ux_designer_node)
    workflow.add_node("security", security_node)
    workflow.add_node("db_agent", db_agent_node)
    
    # === 진입점: route_entry로 라우팅 ===
    workflow.add_conditional_edges(
        START,
        route_entry,
        {
            "orchestrator": "orchestrator",
            "interrupt_handler": "interrupt_handler"
        }
    )
    
    # === Interrupt Handler → Orchestrator 또는 직접 에이전트 ===
    workflow.add_conditional_edges(
        "interrupt_handler",
        lambda x: x.get("next_agent", "orchestrator"),
        {
            "orchestrator": "orchestrator",
            "planner": "planner",
            "coder": "coder",
            "reviewer": "reviewer",
            "tester": "tester",
            "ux_designer": "ux_designer",
            "security": "security",
            "db_agent": "db_agent",
            "finish": END
        }
    )
    
    # === 동적 라우팅 (Orchestrator가 결정) ===
    workflow.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "planner": "planner",
            "coder": "coder",
            "reviewer": "reviewer",
            "tester": "tester",
            "ux_designer": "ux_designer",
            "security": "security",
            "db_agent": "db_agent",
            "finish": END
        }
    )
    
    # === Planner는 조건부 엣지 (phase가 complete가 아니면 자기 자신으로) ===
    workflow.add_conditional_edges(
        "planner",
        lambda x: x.get("next_agent", "orchestrator"),
        {
            "planner": "planner",      # phase가 complete가 아닐 때
            "orchestrator": "orchestrator"  # phase가 complete일 때
        }
    )
    
    # === 나머지 에이전트 → Orchestrator로 복귀 ===
    for agent in ["coder", "reviewer", "tester", "ux_designer", "security", "db_agent"]:
        workflow.add_edge(agent, "orchestrator")
    
    return workflow.compile()


# langgraph.json에서 참조할 그래프
app_graph = create_agent_graph()


# === 테스트용 실행 함수 ===

def run_agent(user_message: str, session_id: str = "test-session"):
    """에이전트 실행 (테스트용)"""
    from langchain_core.messages import HumanMessage
    
    initial_state = create_initial_state(session_id)
    initial_state["messages"] = [HumanMessage(content=user_message)]
    
    print(f"\n{'='*60}")
    print(f"[TEST] 사용자 메시지: {user_message}")
    print(f"{'='*60}")
    
    result = app_graph.invoke(initial_state)
    
    print(f"\n{'='*60}")
    print(f"[TEST] 실행 완료")
    print(f"  - 최종 메시지 수: {len(result.get('messages', []))}")
    print(f"  - 산출물: {list(result.get('artifacts', {}).keys())}")
    print(f"  - 품질 검증: {len(result.get('quality_checks', []))}개")
    print(f"{'='*60}")
    
    return result


if __name__ == "__main__":
    # 테스트 실행
    result = run_agent("간단한 로그인 페이지를 만들어주세요")
