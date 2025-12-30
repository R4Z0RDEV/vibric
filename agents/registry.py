"""
Agent Registry - 에이전트 카탈로그

동적 에이전트 활성화를 위한 에이전트 정의 및 등록
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from enum import Enum


class AgentCapability(Enum):
    """에이전트 능력 분류"""
    PLANNING = "planning"
    CODING = "coding"
    TESTING = "testing"
    REVIEWING = "reviewing"
    DESIGN = "design"
    SECURITY = "security"
    DEVOPS = "devops"


@dataclass
class AgentDefinition:
    """에이전트 정의"""
    name: str
    role: str
    description: str
    capabilities: List[str]
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096
    
    def to_dict(self) -> Dict:
        """딕셔너리로 변환 (프롬프트에서 사용)"""
        return {
            "name": self.name,
            "role": self.role,
            "description": self.description,
            "capabilities": self.capabilities,
        }


# === 에이전트 정의 ===

PLANNER_AGENT = AgentDefinition(
    name="planner",
    role="프로젝트 기획자",
    description="사용자 요구사항을 분석하고 체계적인 실행 계획을 수립합니다.",
    capabilities=[
        "요구사항 분석 및 명확화",
        "기술 스택 추천",
        "작업 분해 (Task Breakdown)",
        "우선순위 결정",
        "리스크 식별"
    ],
    model="gemini-2.5-pro",
    temperature=0.5,
    max_tokens=8192
)

CODER_AGENT = AgentDefinition(
    name="coder",
    role="시니어 풀스택 개발자",
    description="기획에 따라 고품질 프로덕션 코드를 작성합니다.",
    capabilities=[
        "React/Next.js 컴포넌트 작성",
        "TypeScript 타입 안전 코드",
        "Tailwind CSS 스타일링",
        "API 라우트 구현",
        "상태 관리 (Zustand)",
        "에러 핸들링"
    ],
    model="claude-opus-4-5-20251101",
    temperature=0.3,
    max_tokens=16384
)

TESTER_AGENT = AgentDefinition(
    name="tester",
    role="QA 엔지니어",
    description="코드의 품질을 보장하기 위한 테스트를 설계하고 검증합니다.",
    capabilities=[
        "테스트 케이스 설계",
        "엣지 케이스 발견",
        "유닛 테스트 작성",
        "통합 테스트 시나리오",
        "버그 재현 및 보고"
    ],
    model="gpt-5.2",
    temperature=0.3,
    max_tokens=4096
)

REVIEWER_AGENT = AgentDefinition(
    name="reviewer",
    role="시니어 코드 리뷰어",
    description="코드 품질, 보안, 성능을 검토하고 개선점을 제안합니다.",
    capabilities=[
        "코드 품질 검토",
        "보안 취약점 탐지",
        "성능 이슈 발견",
        "Best Practice 검증",
        "리팩토링 제안",
        "코드 스타일 일관성"
    ],
    model="claude-opus-4-5-20251101",
    temperature=0.2,
    max_tokens=8192
)

UX_DESIGNER_AGENT = AgentDefinition(
    name="ux_designer",
    role="UX/UI 디자이너",
    description="사용자 경험과 인터페이스 디자인을 검토하고 개선합니다.",
    capabilities=[
        "와이어프레임 설계",
        "접근성 검토 (WCAG)",
        "반응형 디자인 검토",
        "사용자 플로우 최적화",
        "컴포넌트 라이브러리 활용"
    ],
    model="gemini-2.5-pro",
    temperature=0.5,
    max_tokens=4096
)

SECURITY_AGENT = AgentDefinition(
    name="security",
    role="보안 전문가",
    description="보안 취약점을 분석하고 보안 강화 방안을 제안합니다.",
    capabilities=[
        "OWASP Top 10 검토",
        "인증/인가 검증",
        "입력 검증 확인",
        "XSS/CSRF 방지",
        "의존성 취약점 스캔"
    ],
    model="gpt-5.2",
    temperature=0.2,
    max_tokens=4096
)

DB_AGENT = AgentDefinition(
    name="db_agent",
    role="데이터베이스 엔지니어",
    description="Supabase MCP를 사용하여 데이터베이스 스키마 설계, 테이블 생성, RLS 정책 설정 등을 수행합니다.",
    capabilities=[
        "데이터베이스 스키마 설계",
        "테이블 생성 및 마이그레이션",
        "RLS 정책 설정",
        "SQL 쿼리 실행",
        "인덱스 최적화",
        "Supabase 프로젝트 관리"
    ],
    model="claude-opus-4-5-20251101",
    temperature=0.2,
    max_tokens=8192
)


# === Agent Registry ===

class AgentRegistry:
    """에이전트 카탈로그 관리"""
    
    def __init__(self):
        self._agents: Dict[str, AgentDefinition] = {}
        self._register_default_agents()
    
    def _register_default_agents(self):
        """기본 에이전트 등록"""
        default_agents = [
            PLANNER_AGENT,
            CODER_AGENT,
            TESTER_AGENT,
            REVIEWER_AGENT,
            UX_DESIGNER_AGENT,
            SECURITY_AGENT,
            DB_AGENT,
        ]
        for agent in default_agents:
            self.register(agent)
    
    def register(self, agent: AgentDefinition) -> None:
        """에이전트 등록"""
        self._agents[agent.name] = agent
    
    def get(self, name: str) -> Optional[AgentDefinition]:
        """에이전트 조회"""
        return self._agents.get(name)
    
    def list_all(self) -> List[AgentDefinition]:
        """모든 에이전트 목록"""
        return list(self._agents.values())
    
    def list_names(self) -> List[str]:
        """에이전트 이름 목록"""
        return list(self._agents.keys())
    
    def get_by_capability(self, capability: str) -> List[AgentDefinition]:
        """특정 능력을 가진 에이전트 검색"""
        return [
            agent for agent in self._agents.values()
            if capability.lower() in [c.lower() for c in agent.capabilities]
        ]
    
    def get_registry_description(self) -> str:
        """Orchestrator 프롬프트용 에이전트 카탈로그 설명"""
        lines = []
        for agent in self._agents.values():
            lines.append(f"## {agent.name} ({agent.role})")
            lines.append(f"{agent.description}")
            lines.append("능력:")
            for cap in agent.capabilities:
                lines.append(f"  - {cap}")
            lines.append("")
        return "\n".join(lines)


# === 글로벌 인스턴스 ===

AGENT_REGISTRY = AgentRegistry()


# === 헬퍼 함수 ===

def get_agent(name: str) -> Optional[AgentDefinition]:
    """에이전트 조회 (편의 함수)"""
    return AGENT_REGISTRY.get(name)


def get_all_agents() -> List[AgentDefinition]:
    """모든 에이전트 조회 (편의 함수)"""
    return AGENT_REGISTRY.list_all()


def get_agent_names() -> List[str]:
    """에이전트 이름 목록 (편의 함수)"""
    return AGENT_REGISTRY.list_names()
