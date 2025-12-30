"""
AgentState 및 관련 타입 정의

프로덕션 레벨 멀티 에이전트 시스템을 위한 풍부한 상태 관리
"""

from typing import List, Dict, Optional, Literal, Annotated, Any
from typing_extensions import TypedDict
from dataclasses import dataclass, field
from datetime import datetime
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


# === 기본 타입 정의 ===

class ExecutionStep(TypedDict):
    """실행 계획의 개별 단계"""
    step_number: int
    agent: str
    instruction: str
    expected_output: str
    completed: bool


class ExecutionPlan(TypedDict):
    """Orchestrator가 생성하는 실행 계획"""
    goal: str
    required_agents: List[str]
    steps: List[ExecutionStep]
    created_at: str


class Artifact(TypedDict):
    """에이전트가 생성하는 산출물"""
    type: Literal["plan", "code", "test", "review", "design"]
    file_path: str
    content: str
    created_by: str
    version: int
    created_at: str


class QualityCheck(TypedDict):
    """품질 검증 결과"""
    checker: str
    passed: bool
    issues: List[str]
    suggestions: List[str]
    checked_at: str


class AgentError(TypedDict):
    """에이전트 실행 중 발생한 에러"""
    agent: str
    error_type: str
    message: str
    recoverable: bool
    occurred_at: str


class ProjectContext(TypedDict):
    """프로젝트 컨텍스트 정보"""
    tech_stack: List[str]
    existing_files: List[str]
    constraints: List[str]
    preferences: Dict[str, Any]


class ModificationContext(TypedDict):
    """수정 요청 컨텍스트 - interrupt_handler가 설정, 에이전트가 사용"""
    type: Literal["reset", "modify", "append"]
    instruction: str             # 수정 지시사항
    target_files: List[str]      # 수정 대상 파일 경로들
    original_goal: str           # 원래 목표 (reset 시에도 유지)


# === 메인 AgentState ===

class AgentState(TypedDict):
    """
    멀티 에이전트 시스템의 공유 상태
    
    Orchestrator와 모든 에이전트가 이 상태를 읽고 쓸 수 있음
    """
    
    # === 기본 대화 ===
    messages: Annotated[List[BaseMessage], add_messages]
    
    # === 라우팅 ===
    next_agent: str  # Orchestrator가 결정하는 다음 에이전트
    
    # === 실행 계획 ===
    execution_plan: Optional[ExecutionPlan]
    current_step: int
    
    # === 작업 산출물 ===
    artifacts: Dict[str, Artifact]  # file_path -> Artifact
    
    # === 품질 추적 ===
    quality_checks: List[QualityCheck]
    iteration_count: int
    max_iterations: int  # 기본값: 5
    
    # === 컨텍스트 ===
    project_context: Optional[ProjectContext]
    modification_context: Optional[ModificationContext]  # 수정 요청 시 설정됨
    
    # === 에러 처리 ===
    errors: List[AgentError]
    retry_count: int
    
    # === 메타데이터 ===
    session_id: str
    started_at: str


# === 상태 초기화 헬퍼 ===

def create_initial_state(
    session_id: str,
    messages: List[BaseMessage] = None,
    project_context: ProjectContext = None,
    max_iterations: int = 5  # 수정 요청 최대 5회까지 허용
) -> AgentState:
    """새 세션을 위한 초기 상태 생성"""
    return AgentState(
        messages=messages or [],
        next_agent="orchestrator",
        execution_plan=None,
        current_step=0,
        artifacts={},
        quality_checks=[],
        iteration_count=0,
        modification_context=None,  # 수정 요청 시 interrupt_handler가 설정
        max_iterations=max_iterations,
        project_context=project_context,
        errors=[],
        retry_count=0,
        session_id=session_id,
        started_at=datetime.now().isoformat()
    )


# === 상태 유틸리티 함수 ===

def add_artifact(state: AgentState, artifact: Artifact) -> AgentState:
    """산출물 추가"""
    artifacts = state.get("artifacts", {})
    artifacts[artifact["file_path"]] = artifact
    state["artifacts"] = artifacts
    return state


def add_quality_check(state: AgentState, check: QualityCheck) -> AgentState:
    """품질 검증 결과 추가"""
    quality_checks = state.get("quality_checks", [])
    quality_checks.append(check)
    state["quality_checks"] = quality_checks
    return state


def add_error(state: AgentState, error: AgentError) -> AgentState:
    """에러 추가"""
    errors = state.get("errors", [])
    errors.append(error)
    state["errors"] = errors
    return state


def should_continue_iteration(state: AgentState) -> bool:
    """반복 계속 여부 확인"""
    return state.get("iteration_count", 0) < state.get("max_iterations", 5)


def get_latest_artifact(state: AgentState, artifact_type: str) -> Optional[Artifact]:
    """특정 타입의 최신 산출물 가져오기"""
    artifacts = state.get("artifacts", {})
    artifacts_of_type = [
        a for a in artifacts.values() 
        if a["type"] == artifact_type
    ]
    if not artifacts_of_type:
        return None
    return max(artifacts_of_type, key=lambda a: a["version"])


def get_failed_quality_checks(state: AgentState) -> List[QualityCheck]:
    """실패한 품질 검증 목록"""
    quality_checks = state.get("quality_checks", [])
    return [qc for qc in quality_checks if not qc["passed"]]
