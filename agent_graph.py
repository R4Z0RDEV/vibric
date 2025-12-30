import os
from typing import List, Literal, Annotated
from typing_extensions import TypedDict
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

load_dotenv('.env')

# --- 유효한 Gemini 모델명 사용 ---
# gemini-1.5 시리즈는 더 이상 사용 불가. gemini-2.5 사용
llm_flash = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
llm_pro = ChatGoogleGenerativeAI(model="gemini-2.5-pro")
llm_coder = ChatAnthropic(model="claude-3-5-sonnet-latest")
llm_reviewer = ChatOpenAI(model="gpt-4o")

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    next_step: str

def supervisor_node(state: AgentState):
    """관리자: 대화 내용을 보고 누구에게 일을 시킬지 결정"""
    messages = state.get('messages', [])
    
    print(f"\n[DEBUG] 현재 메시지 개수: {len(messages)}")
    
    if not messages:
        print("[DEBUG] 메시지가 비어있음 -> FINISH")
        return {"next_step": "FINISH"}
    
    last_msg = messages[-1]
    
    # 핵심 수정: 마지막 메시지가 AI 응답이면 작업 완료로 처리
    if isinstance(last_msg, AIMessage):
        print(f"[DEBUG] 마지막 메시지가 AI 응답임 -> FINISH")
        return {"next_step": "FINISH"}
    
    # HumanMessage인 경우에만 키워드 감지 수행
    content = last_msg.content
    print(f"[DEBUG] 사용자 메시지: {content}")
    
    # 키워드 감지 로직
    if "기획" in content or "설계" in content:
        print("[DEBUG] 결정: PM에게 전달")
        return {"next_step": "pm"}
    elif "검토" in content or "에러" in content:
        print("[DEBUG] 결정: Reviewer에게 전달")
        return {"next_step": "reviewer"}
    elif "코드" in content or "만들어" in content:
        print("[DEBUG] 결정: Coder에게 전달")
        return {"next_step": "coder"}
    
    print("[DEBUG] 매칭되는 키워드 없음 -> FINISH")
    return {"next_step": "FINISH"}

def pm_node(state: AgentState):
    print("\n[DEBUG] PM 에이전트 작동 시작...")
    sys_msg = HumanMessage(content="당신은 전문 IT 기획자입니다. 요구사항을 분석해 기획안을 작성하세요.")
    res = llm_pro.invoke([sys_msg] + state['messages'])
    return {"messages": [res], "next_step": "supervisor"}

def coder_node(state: AgentState):
    print("\n[DEBUG] Coder 에이전트 작동 시작...")
    sys_msg = HumanMessage(content="당신은 수석 개발자입니다. 기획안에 따라 Next.js 코드를 작성하세요.")
    res = llm_coder.invoke([sys_msg] + state['messages'])
    return {"messages": [res], "next_step": "reviewer"} 

def reviewer_node(state: AgentState):
    print("\n[DEBUG] Reviewer 에이전트 작동 시작...")
    sys_msg = HumanMessage(content="당신은 코드 리뷰어입니다. 보안 취약점과 개선점을 찾으세요.")
    res = llm_reviewer.invoke([sys_msg] + state['messages'])
    return {"messages": [res], "next_step": "supervisor"}

workflow = StateGraph(AgentState)

workflow.add_node("supervisor", supervisor_node)
workflow.add_node("pm", pm_node)
workflow.add_node("coder", coder_node)
workflow.add_node("reviewer", reviewer_node)

workflow.set_entry_point("supervisor")

# supervisor가 초기 라우팅만 담당
workflow.add_conditional_edges(
    "supervisor",
    lambda x: x['next_step'],
    {
        "pm": "pm",
        "coder": "coder",
        "reviewer": "reviewer",
        "FINISH": END
    }
)

# 멀티 에이전트 파이프라인: pm → coder → reviewer → END
# "기획" 요청 시: pm → coder → reviewer → END 순차 실행
workflow.add_edge("pm", "coder")
workflow.add_edge("coder", "reviewer")
workflow.add_edge("reviewer", END)

app_graph = workflow.compile()