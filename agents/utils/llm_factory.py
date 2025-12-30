"""
LLM Factory - LLM 인스턴스 생성 팩토리

에이전트별 최적화된 LLM 인스턴스 생성
"""

import os
from typing import Optional, Dict, Any
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel

from agents.registry import AgentDefinition, get_agent


# === LLM 프로바이더 매핑 ===

PROVIDER_MAP = {
    "gemini": ChatGoogleGenerativeAI,
    "claude": ChatAnthropic,
    "gpt": ChatOpenAI,
}


def get_provider_from_model(model_name: str) -> str:
    """모델 이름에서 프로바이더 추출"""
    if "gemini" in model_name.lower():
        return "gemini"
    elif "claude" in model_name.lower():
        return "claude"
    elif "gpt" in model_name.lower() or "o1" in model_name.lower():
        return "gpt"
    else:
        raise ValueError(f"알 수 없는 모델: {model_name}")


def create_llm(
    model_name: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    agent_name: Optional[str] = None,
    **kwargs
) -> BaseChatModel:
    """
    LLM 인스턴스 생성
    
    Args:
        model_name: 모델 이름 (e.g., "gemini-2.5-pro", "claude-3-5-sonnet-latest")
        temperature: 생성 온도
        max_tokens: 최대 토큰 수
        agent_name: 에이전트 이름 (LangSmith 태깅용)
        **kwargs: 추가 설정
    
    Returns:
        BaseChatModel 인스턴스
    """
    provider = get_provider_from_model(model_name)
    
    # 공통 설정
    common_config = {
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    # LangSmith 태깅 (에이전트별 추적)
    if agent_name:
        common_config["tags"] = [agent_name]
        common_config["metadata"] = {"agent": agent_name}
    
    # 프로바이더별 LLM 생성
    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            max_output_tokens=max_tokens,
            **kwargs
        )
    elif provider == "claude":
        return ChatAnthropic(
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    elif provider == "gpt":
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
    else:
        raise ValueError(f"지원하지 않는 프로바이더: {provider}")


def create_llm_for_agent(agent_name: str, **kwargs) -> BaseChatModel:
    """
    에이전트 정의에 따라 LLM 인스턴스 생성
    
    Args:
        agent_name: Agent Registry에 등록된 에이전트 이름
        **kwargs: 추가 설정 (온도, 토큰 수 오버라이드 가능)
    
    Returns:
        BaseChatModel 인스턴스
    """
    agent = get_agent(agent_name)
    if not agent:
        raise ValueError(f"등록되지 않은 에이전트: {agent_name}")
    
    return create_llm(
        model_name=agent.model,
        temperature=kwargs.get("temperature", agent.temperature),
        max_tokens=kwargs.get("max_tokens", agent.max_tokens),
        agent_name=agent_name,
        **{k: v for k, v in kwargs.items() if k not in ["temperature", "max_tokens"]}
    )


# === 캐시된 LLM 인스턴스 ===

@lru_cache(maxsize=10)
def get_cached_llm(model_name: str, temperature: float, max_tokens: int) -> BaseChatModel:
    """
    캐시된 LLM 인스턴스 반환 (동일 설정 시 재사용)
    
    주의: 캐시는 프로세스 수명 동안 유지됨
    """
    return create_llm(model_name, temperature, max_tokens)


# === 편의 함수 ===

def get_orchestrator_llm() -> BaseChatModel:
    """Orchestrator용 LLM (고성능 모델)"""
    return create_llm(
        model_name="gemini-2.5-pro",
        temperature=0.3,
        max_tokens=8192,
        agent_name="orchestrator"
    )


def get_planner_llm() -> BaseChatModel:
    """Planner용 LLM"""
    return create_llm_for_agent("planner")


def get_coder_llm() -> BaseChatModel:
    """Coder용 LLM"""
    return create_llm_for_agent("coder")


def get_reviewer_llm() -> BaseChatModel:
    """Reviewer용 LLM"""
    return create_llm_for_agent("reviewer")


def get_tester_llm() -> BaseChatModel:
    """Tester용 LLM"""
    return create_llm_for_agent("tester")


# === 환경 검증 ===

def verify_api_keys() -> Dict[str, bool]:
    """
    필수 API 키 존재 여부 확인
    
    Returns:
        프로바이더별 API 키 존재 여부
    """
    return {
        "google": bool(os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "langsmith": bool(os.getenv("LANGCHAIN_API_KEY")),
    }


def get_missing_api_keys() -> list:
    """누락된 API 키 목록"""
    key_status = verify_api_keys()
    required_keys = ["google", "anthropic", "openai"]
    return [key for key in required_keys if not key_status[key]]
