"""
MCP Tools for LangGraph Agents

langchain-mcp-adapters를 사용하여 MCP 서버를 LangChain Tool로 래핑
"""

import os
from typing import List, Optional
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools


# === Supabase MCP 클라이언트 ===

def get_supabase_mcp_client() -> Optional[MultiServerMCPClient]:
    """
    Supabase MCP 클라이언트 생성
    
    환경 변수:
    - SUPABASE_ACCESS_TOKEN: Supabase Personal Access Token
    """
    access_token = os.getenv("SUPABASE_ACCESS_TOKEN")
    
    if not access_token:
        print("[MCP] ⚠️ SUPABASE_ACCESS_TOKEN이 설정되지 않았습니다.")
        return None
    
    # Supabase MCP 서버 설정 (npx로 실행)
    client = MultiServerMCPClient({
        "supabase": {
            "command": "npx",
            "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", access_token],
            "transport": "stdio"
        }
    })
    
    return client


async def get_supabase_tools() -> List[BaseTool]:
    """
    Supabase MCP에서 LangChain Tools 로드
    
    사용 가능한 도구:
    - list_projects: 프로젝트 목록 조회
    - get_project: 프로젝트 정보 조회
    - list_tables: 테이블 목록 조회
    - execute_sql: SQL 쿼리 실행
    - apply_migration: 마이그레이션 적용
    - get_advisors: 보안/성능 권고사항 조회
    등
    """
    client = get_supabase_mcp_client()
    
    if not client:
        return []
    
    try:
        async with client:
            tools = await load_mcp_tools(client)
            print(f"[MCP] ✅ Supabase Tools 로드 완료: {len(tools)}개")
            return tools
    except Exception as e:
        print(f"[MCP] ❌ Supabase Tools 로드 실패: {e}")
        return []


# === 동기식 래퍼 (LangGraph 노드에서 사용) ===

import asyncio

def get_supabase_tools_sync() -> List[BaseTool]:
    """
    Supabase Tools 동기식 래퍼
    
    LangGraph 노드에서 직접 호출 가능
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(get_supabase_tools())


# === 캐싱된 Tools ===

_cached_tools: Optional[List[BaseTool]] = None

def get_tools(force_reload: bool = False) -> List[BaseTool]:
    """
    캐싱된 MCP Tools 반환
    
    첫 호출 시 MCP 서버 연결하여 로드, 이후 캐싱된 결과 반환
    """
    global _cached_tools
    
    if _cached_tools is None or force_reload:
        _cached_tools = get_supabase_tools_sync()
    
    return _cached_tools


# === 테스트 ===

if __name__ == "__main__":
    print("MCP Tools 테스트 시작...")
    
    tools = get_tools()
    
    if tools:
        print(f"\n로드된 도구 ({len(tools)}개):")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description[:50]}...")
    else:
        print("도구가 로드되지 않았습니다. SUPABASE_ACCESS_TOKEN을 확인하세요.")
