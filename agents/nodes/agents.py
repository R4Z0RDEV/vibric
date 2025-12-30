"""
기본 에이전트 노드 구현

각 에이전트의 실행 로직
"""

from typing import Dict, Any
from datetime import datetime

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.types import interrupt

from agents.state import AgentState, Artifact, QualityCheck
from agents.registry import get_agent
from agents.utils.llm_factory import create_llm_for_agent


# === Planner 노드 ===

PLANNER_SYSTEM_PROMPT = """# Brainstorming & Planning

## Overview
사용자의 아이디어를 명확한 설계로 발전시킵니다.
한 번에 하나씩 질문하며 요구사항을 정확히 파악합니다.

## The Process

**Step 1: 아이디어 이해**
- 한 번에 하나의 질문만 하세요
- 가능하면 객관식 질문을 선호하세요
- 목적, 제약사항, 성공 기준을 파악하세요

**Step 2: 접근 방식 탐색**
- 2-3가지 다른 접근 방식과 트레이드오프를 제안하세요
- 추천 옵션과 이유를 먼저 제시하세요

**Step 3: 설계 제시**
- 이해했다고 확신하면 설계를 제시하세요
- 아키텍처, 컴포넌트, 데이터 흐름을 다루세요

## Key Principles
- **한 번에 하나의 질문** - 여러 질문으로 압도하지 마세요
- **YAGNI** - 불필요한 기능은 과감히 제거하세요
- **대안 탐색** - 항상 2-3가지 접근 방식을 제안하세요

## 출력 형식 (JSON)
{
  "phase": "understanding|exploring|designing",
  "question": "사용자에게 할 질문 (1개만)",
  "options": ["옵션1", "옵션2", "옵션3"],
  "design": null
}

또는 설계가 완료되면:
{
  "phase": "complete",
  "question": null,
  "design": {
    "goal": "목표 한 줄",
    "requirements": ["요구사항1"],
    "tech_stack": ["React", "TypeScript"],
    "tasks": ["작업1", "작업2"],
    "outputs": ["산출물1"]
  }
}
"""


def planner_node(state: AgentState) -> Dict[str, Any]:
    """Planner 에이전트 노드"""
    print("\n[PLANNER] 기획 작업 시작...")
    
    agent = get_agent("planner")
    llm = create_llm_for_agent("planner")
    
    # 이전 기획안 확인
    artifacts = state.get("artifacts", {})
    previous_plan = ""
    if "plan.md" in artifacts:
        previous_plan = artifacts["plan.md"]["content"]
    
    # 유저 응답 확인 (메시지에서 가장 최근 [수정 요청] 찾기)
    user_answer = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, (AIMessage, HumanMessage)):
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if "[수정 요청]" in content or "[유저 피드백]" in content:
                user_answer = content
                print(f"[PLANNER] 유저 응답 발견: {user_answer[:100]}...")
                break
    
    # 최근 지시사항 추출
    instruction = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, AIMessage) and "[Orchestrator]" in msg.content:
            instruction = msg.content
            break
        elif isinstance(msg, HumanMessage) and "[수정 요청]" not in msg.content:
            instruction = msg.content
            break
    
    # 유저 응답이 있으면 이전 기획안 + 유저 답변 기반으로 진행
    if user_answer and previous_plan:
        prompt = f"""## 유저 응답
{user_answer}

## 이전 기획안
{previous_plan}

유저가 위와 같이 응답했습니다. 이 응답을 반영하여 기획안을 업데이트하세요.
- phase를 "designing" 또는 "complete"로 진행하세요
- 유저의 선택에 맞는 구체적인 설계를 제시하세요"""
    else:
        prompt = f"다음 요청에 대한 기획안을 작성하세요:\n\n{instruction}"
    
    messages = [
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    response = llm.invoke(messages)
    
    # 산출물 저장
    artifact: Artifact = {
        "type": "plan",
        "file_path": "plan.md",
        "content": response.content,
        "created_by": "planner",
        "version": len([a for a in state.get("artifacts", {}).values() if a["type"] == "plan"]) + 1,
        "created_at": datetime.now().isoformat()
    }
    
    print(f"[PLANNER] 기획 완료. 길이: {len(response.content)} 문자")
    
    # === Human-in-the-Loop: 기획안 확인 ===
    user_feedback = interrupt({
        "stage": "planner_complete",
        "message": "기획안이 완성되었습니다. 계속 진행할까요? (수정 요청이 있으면 입력하세요)",
        "preview": response.content[:500] if len(response.content) > 500 else response.content
    })
    
    # 유저 피드백이 있으면 즉시 반영하여 기획안 업데이트
    if user_feedback and isinstance(user_feedback, str) and user_feedback.strip():
        print(f"[PLANNER] 유저 피드백 반영: {user_feedback}")
        
        # 피드백을 반영하여 기획안 재생성
        updated_prompt = f"""## 유저 피드백
{user_feedback}

## 이전 기획안
{response.content}

유저의 피드백을 반영하여 기획안을 업데이트하세요.
- 유저가 선택한 옵션에 맞게 phase를 "designing" 또는 "complete"로 진행하세요
- 구체적인 설계를 제시하세요"""
        
        updated_messages = [
            SystemMessage(content=PLANNER_SYSTEM_PROMPT),
            HumanMessage(content=updated_prompt)
        ]
        
        updated_response = llm.invoke(updated_messages)
        
        # 업데이트된 기획안 저장
        updated_artifact: Artifact = {
            "type": "plan",
            "file_path": "plan.md",
            "content": updated_response.content,
            "created_by": "planner",
            "version": artifact["version"] + 1,
            "created_at": datetime.now().isoformat()
        }
        
        print(f"[PLANNER] 기획안 업데이트 완료. 길이: {len(updated_response.content)} 문자")
        
        # phase 확인하여 완료 여부 판단
        is_complete = '"phase": "complete"' in updated_response.content or '"phase":"complete"' in updated_response.content
        next_dest = "orchestrator" if is_complete else "planner"
        
        print(f"[PLANNER] 기획 phase 완료 여부: {is_complete}, 다음: {next_dest}")
        
        return {
            "messages": [updated_response],
            "artifacts": {**state.get("artifacts", {}), "plan.md": updated_artifact},
            "next_agent": next_dest
        }
    
    # 첫 기획안도 phase 확인
    is_complete = '"phase": "complete"' in response.content or '"phase":"complete"' in response.content
    next_dest = "orchestrator" if is_complete else "planner"
    
    print(f"[PLANNER] 기획 phase 완료 여부: {is_complete}, 다음: {next_dest}")
    
    return {
        "messages": [response],
        "artifacts": {**state.get("artifacts", {}), "plan.md": artifact},
        "next_agent": next_dest
    }


# === Coder 노드 ===

CODER_SYSTEM_PROMPT = """# Executing Code Implementation

## Overview
기획안을 로드하고, 단계별로 코드를 작성합니다.

**Core principle:** 배치 실행 + 검증 체크포인트

## Tech Stack (Required)
- **Framework**: React (mandatory)
- **Language**: TypeScript strict mode
- **Styling**: Tailwind CSS
- **State**: Zustand or React hooks

## The Process

### Step 1: 기획안 분석
1. 기획안을 읽고 질문/우려 사항 파악
2. 우려 사항 있으면 먼저 질문
3. 없으면 구현 진행

### Step 2: 코드 작성
- 컴포넌트는 함수형으로 (React.FC)
- 적절한 주석 포함
- 재사용 가능한 구조
- 접근성(a11y) 고려

### Step 3: 검증
- 타입 오류 없음 확인
- 기본 기능 동작 확인

## When to Stop
- 기획안에 불명확한 부분이 있으면 질문
- 추측하지 말고 확인

## 출력 형식 (JSON)
{
  "files": [{"path": "파일경로", "content": "코드내용"}],
  "summary": "한 줄 요약"
}
"""


def coder_node(state: AgentState) -> Dict[str, Any]:
    """Coder 에이전트 노드"""
    print("\n[CODER] 코드 작성 시작...")
    
    llm = create_llm_for_agent("coder")
    
    # === 기본 데이터 추출 ===
    artifacts = state.get("artifacts", {})
    plan_content = artifacts.get("plan.md", {}).get("content", "")
    previous_code = artifacts.get("code.tsx", {}).get("content", "")
    
    # === modification_context 확인 (핵심 개선) ===
    mod_ctx = state.get("modification_context")
    
    if mod_ctx and mod_ctx.get("type") in ["modify", "append"]:
        # === 수정/추가 모드 ===
        print(f"[CODER] 수정 모드: {mod_ctx['type']}")
        print(f"[CODER] 지시: {mod_ctx['instruction']}")
        print(f"[CODER] 대상 파일: {mod_ctx['target_files']}")
        
        # 수정 대상 파일 내용 수집
        target_contents = []
        for file_path in mod_ctx.get("target_files", []):
            if file_path in artifacts:
                content = artifacts[file_path].get("content", "")
                target_contents.append(f"### {file_path}\n```tsx\n{content}\n```")
        
        target_files_str = "\n\n".join(target_contents) if target_contents else "대상 파일 없음"
        
        if mod_ctx["type"] == "modify":
            prompt = f"""## 수정 요청
{mod_ctx['instruction']}

## 수정 대상 파일 (반드시 유지하면서 수정)
{target_files_str}

## 규칙
1. 기존 코드 구조를 **유지**하세요
2. 요청된 부분만 **정확히** 수정하세요
3. 불필요한 삭제는 하지 마세요
4. 전체 수정된 코드를 JSON 형식으로 출력하세요

위 규칙에 따라 수정된 코드를 작성하세요."""
        else:  # append
            prompt = f"""## 추가 요청
{mod_ctx['instruction']}

## 기존 코드 (유지)
{target_files_str}

## 규칙
1. 기존 코드를 **그대로 유지**하면서 추가하세요
2. 새로운 기능/컴포넌트를 추가하세요
3. 기존 코드와 일관된 스타일을 유지하세요
4. 전체 코드를 JSON 형식으로 출력하세요

위 규칙에 따라 추가된 코드를 작성하세요."""
    
    else:
        # === 신규 생성 모드 ===
        print("[CODER] 신규 생성 모드")
        
        instruction = ""
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, AIMessage) and "[Orchestrator]" in msg.content:
                instruction = msg.content
                break
        
        prompt = f"""## 기획안
{plan_content if plan_content else "기획안 없음"}

## 지시사항
{instruction if instruction else "기획안에 따라 코드를 작성하세요"}

위 내용을 바탕으로 코드를 작성하세요."""
    
    messages = [
        SystemMessage(content=CODER_SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    response = llm.invoke(messages)
    
    # 산출물 저장
    artifact: Artifact = {
        "type": "code",
        "file_path": "code.tsx",
        "content": response.content,
        "created_by": "coder",
        "version": len([a for a in state.get("artifacts", {}).values() if a["type"] == "code"]) + 1,
        "created_at": datetime.now().isoformat()
    }
    
    print(f"[CODER] 코드 작성 완료. 길이: {len(response.content)} 문자")
    
    # === Human-in-the-Loop: 유저 피드백 요청 ===
    user_feedback = interrupt({
        "stage": "coder_complete",
        "message": "코드 작성이 완료되었습니다. 계속 진행할까요? (수정 요청이 있으면 입력하세요)",
        "preview": response.content[:500] if len(response.content) > 500 else response.content
    })
    
    # 유저가 수정 요청을 입력한 경우 - 즉시 반영
    if user_feedback and isinstance(user_feedback, str) and user_feedback.strip():
        print(f"[CODER] 유저 피드백 반영: {user_feedback}")
        
        # 피드백을 반영하여 코드 재생성
        updated_prompt = f"""## 중요: 기존 코드에 추가/수정하세요

### 수정 요청
{user_feedback}

### 기존 코드 (반드시 유지)
```tsx
{response.content}
```

## 규칙
1. 기존 코드를 **삭제하지 마세요**
2. 수정 요청에 맞게 **추가**하거나 **부분 수정**하세요
3. 전체 코드를 JSON 형식으로 출력하세요"""
        
        updated_messages = [
            SystemMessage(content=CODER_SYSTEM_PROMPT),
            HumanMessage(content=updated_prompt)
        ]
        
        updated_response = llm.invoke(updated_messages)
        
        # 업데이트된 코드 저장
        updated_artifact: Artifact = {
            "type": "code",
            "file_path": "code.tsx",
            "content": updated_response.content,
            "created_by": "coder",
            "version": artifact["version"] + 1,
            "created_at": datetime.now().isoformat()
        }
        
        print(f"[CODER] 코드 업데이트 완료. 길이: {len(updated_response.content)} 문자")
        
        return {
            "messages": [updated_response],
            "artifacts": {**state.get("artifacts", {}), "code.tsx": updated_artifact},
            "next_agent": "orchestrator",
            "iteration_count": state.get("iteration_count", 0) + 1,
            "modification_context": None  # 수정 완료 후 초기화
        }
    
    return {
        "messages": [response],
        "artifacts": {**state.get("artifacts", {}), "code.tsx": artifact},
        "next_agent": "orchestrator",
        "modification_context": None  # 수정 완료 후 초기화
    }


# === Reviewer 노드 ===

REVIEWER_SYSTEM_PROMPT = """# Code Review Workflow

## Overview
체계적으로 코드를 검토하고 명확한 판정을 내립니다.

**Core principle:** 근본 원인 분석 → 패턴 비교 → 판정

## The Process

### Phase 1: 코드 분석
- 전체 구조 파악
- 핵심 로직 이해
- 에러 흐름 추적

### Phase 2: 패턴 비교
- 좋은 사례와 비교
- 차이점 식별
- 왜 그렇게 했는지 이해

### Phase 3: 판정
- **pass**: 심각한 이슈 없음
- **fail**: 수정 필요한 이슈 있음

## Ignore (무시할 항목)
- .env, API 키, 환경변수
- 사소한 스타일 이슈
- 주관적 선호

## When to Ask
불확실하면 판단하지 말고 질문하세요.

## 출력 형식 (JSON)
{
  "verdict": "pass",
  "issues": [],
  "summary": "한 줄 평가"
}
"""


def reviewer_node(state: AgentState) -> Dict[str, Any]:
    """Reviewer 에이전트 노드"""
    print("\n[REVIEWER] 코드 리뷰 시작...")
    
    llm = create_llm_for_agent("reviewer")
    
    # 리뷰할 코드 추출
    artifacts = state.get("artifacts", {})
    code_content = ""
    if "code.tsx" in artifacts:
        code_content = artifacts["code.tsx"]["content"]
    
    prompt = f"""다음 코드를 리뷰하세요:

{code_content if code_content else "리뷰할 코드가 없습니다."}"""
    
    messages = [
        SystemMessage(content=REVIEWER_SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    response = llm.invoke(messages)
    
    # 품질 검증 결과 파싱
    passed = "통과" in response.content and "수정필요" not in response.content
    issues = []
    if "발견된 이슈" in response.content:
        # 간단한 이슈 추출
        issues = ["리뷰 결과에서 이슈 발견됨"]
    
    quality_check: QualityCheck = {
        "checker": "reviewer",
        "passed": passed,
        "issues": issues,
        "suggestions": [],
        "checked_at": datetime.now().isoformat()
    }
    
    # 산출물 저장
    artifact: Artifact = {
        "type": "review",
        "file_path": "review.md",
        "content": response.content,
        "created_by": "reviewer",
        "version": 1,
        "created_at": datetime.now().isoformat()
    }
    
    print(f"[REVIEWER] 리뷰 완료. 결과: {'통과' if passed else '수정필요'}")
    
    # === Human-in-the-Loop: 리뷰 결과 확인 ===
    user_feedback = interrupt({
        "stage": "reviewer_complete",
        "message": f"코드 리뷰가 완료되었습니다. 결과: {'✅ 통과' if passed else '❌ 수정필요'}. 계속 진행할까요?",
        "preview": response.content[:500] if len(response.content) > 500 else response.content
    })
    
    if user_feedback and isinstance(user_feedback, str) and user_feedback.strip():
        print(f"[REVIEWER] 유저 피드백: {user_feedback}")
        return {
            "messages": [HumanMessage(content=f"[유저 피드백] {user_feedback}")],
            "artifacts": {**state.get("artifacts", {}), "review.md": artifact},
            "quality_checks": state.get("quality_checks", []) + [quality_check],
            "next_agent": "orchestrator"  # orchestrator가 판단
        }
    
    return {
        "messages": [response],
        "artifacts": {**state.get("artifacts", {}), "review.md": artifact},
        "quality_checks": state.get("quality_checks", []) + [quality_check],
        "next_agent": "orchestrator"
    }


# === Tester 노드 ===

TESTER_SYSTEM_PROMPT = """당신은 QA 엔지니어입니다.

## 역할
- 테스트 케이스를 설계합니다
- 테스트 코드를 작성합니다

## 출력 형식 (JSON)
{
  "test_cases": ["테스트케이스1", "테스트케이스2"],
  "test_code": "// 테스트 코드",
  "summary": "한 줄 요약"
}
"""


def tester_node(state: AgentState) -> Dict[str, Any]:
    """Tester 에이전트 노드"""
    print("\n[TESTER] 테스트 작성 시작...")
    
    llm = create_llm_for_agent("tester")
    
    artifacts = state.get("artifacts", {})
    code_content = ""
    if "code.tsx" in artifacts:
        code_content = artifacts["code.tsx"]["content"]
    
    messages = [
        SystemMessage(content=TESTER_SYSTEM_PROMPT),
        HumanMessage(content=f"다음 코드에 대한 테스트를 작성하세요:\n\n{code_content}")
    ]
    
    response = llm.invoke(messages)
    
    artifact: Artifact = {
        "type": "test",
        "file_path": "test.ts",
        "content": response.content,
        "created_by": "tester",
        "version": 1,
        "created_at": datetime.now().isoformat()
    }
    
    print(f"[TESTER] 테스트 작성 완료")
    
    return {
        "messages": [response],
        "artifacts": {**state.get("artifacts", {}), "test.ts": artifact},
        "next_agent": "orchestrator"
    }


UX_DESIGNER_SYSTEM_PROMPT = """당신은 UX/UI 디자이너입니다.

## 출력 형식 (JSON)
{
  "verdict": "pass",
  "ux_issues": [],
  "suggestions": [],
  "summary": "한 줄 평가"
}
"""


def ux_designer_node(state: AgentState) -> Dict[str, Any]:
    """UX Designer 에이전트 노드"""
    print("\n[UX_DESIGNER] UX 검토 시작...")
    
    llm = create_llm_for_agent("ux_designer")
    
    messages = [
        SystemMessage(content=UX_DESIGNER_SYSTEM_PROMPT),
        HumanMessage(content=f"현재 산출물을 검토하세요:\n{list(state.get('artifacts', {}).keys())}")
    ]
    
    response = llm.invoke(messages)
    
    return {
        "messages": [response],
        "next_agent": "orchestrator"
    }


SECURITY_SYSTEM_PROMPT = """당신은 보안 전문가입니다. OWASP Top 10 기준.

## 출력 형식 (JSON)
{
  "verdict": "pass",
  "vulnerabilities": [],
  "recommendations": [],
  "summary": "한 줄 평가"
}
"""


def security_node(state: AgentState) -> Dict[str, Any]:
    """Security 에이전트 노드"""
    print("\n[SECURITY] 보안 검토 시작...")
    
    llm = create_llm_for_agent("security")
    
    code_content = state.get("artifacts", {}).get("code.tsx", {}).get("content", "")
    
    messages = [
        SystemMessage(content=SECURITY_SYSTEM_PROMPT),
        HumanMessage(content=f"다음 코드의 보안을 검토하세요:\n\n{code_content[:500] if code_content else '보안 검토할 코드 없음'}")
    ]
    
    response = llm.invoke(messages)
    
    return {
        "messages": [response],
        "next_agent": "orchestrator"
    }


# === DB Agent 노드 (Supabase MCP) ===

DB_AGENT_SYSTEM_PROMPT = """당신은 데이터베이스 엔지니어입니다. Supabase를 사용합니다.

## 역할
- 데이터베이스 스키마 설계
- 테이블 생성 및 마이그레이션
- RLS (Row Level Security) 정책 설정
- SQL 쿼리 실행

## 도구 사용법
제공된 Supabase 도구를 사용하여 작업을 수행하세요:
- supabase_list_projects: 프로젝트 목록 조회
- supabase_list_tables: 테이블 목록 조회
- supabase_execute_sql: SQL 쿼리 실행
- supabase_apply_migration: 마이그레이션 적용

## 출력 형식 (JSON)
{
  "action": "executed",
  "results": [...],
  "summary": "한 줄 요약"
}
"""


def db_agent_node(state: AgentState) -> Dict[str, Any]:
    """DB Agent 노드 - Supabase MCP Tools 사용"""
    print("\n[DB_AGENT] 데이터베이스 작업 시작...")
    
    from agents.utils.mcp_tools import get_tools
    
    llm = create_llm_for_agent("db_agent")
    
    # MCP Tools 로드
    tools = get_tools()
    
    if not tools:
        print("[DB_AGENT] ⚠️ MCP Tools 로드 실패. SUPABASE_ACCESS_TOKEN을 확인하세요.")
        return {
            "messages": [AIMessage(content="⚠️ Supabase 연결이 설정되지 않았습니다. SUPABASE_ACCESS_TOKEN을 설정해주세요.")],
            "next_agent": "orchestrator"
        }
    
    print(f"[DB_AGENT] ✅ {len(tools)}개 도구 로드됨")
    
    # 지시사항 추출
    instruction = ""
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, AIMessage) and "[Orchestrator]" in msg.content:
            instruction = msg.content
            break
        elif isinstance(msg, HumanMessage):
            instruction = msg.content
            break
    
    # LLM에 Tools 바인딩
    llm_with_tools = llm.bind_tools(tools)
    
    messages = [
        SystemMessage(content=DB_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=f"다음 데이터베이스 작업을 수행하세요:\n\n{instruction}")
    ]
    
    response = llm_with_tools.invoke(messages)
    
    # Tool 호출 처리
    if hasattr(response, 'tool_calls') and response.tool_calls:
        print(f"[DB_AGENT] 🔧 {len(response.tool_calls)}개 도구 호출")
        
        tool_results = []
        for tool_call in response.tool_calls:
            tool_name = tool_call.get('name', '')
            tool_args = tool_call.get('args', {})
            
            print(f"[DB_AGENT] 호출: {tool_name}({tool_args})")
            
            # 도구 찾기 및 실행
            for tool in tools:
                if tool.name == tool_name:
                    try:
                        result = tool.invoke(tool_args)
                        tool_results.append(f"✅ {tool_name}: {str(result)[:200]}")
                    except Exception as e:
                        tool_results.append(f"❌ {tool_name}: {str(e)}")
                    break
        
        result_content = f"데이터베이스 작업 결과:\n" + "\n".join(tool_results)
        return {
            "messages": [AIMessage(content=result_content)],
            "next_agent": "orchestrator"
        }
    
    print(f"[DB_AGENT] 완료: {len(response.content)} 문자")
    
    return {
        "messages": [response],
        "next_agent": "orchestrator"
    }

