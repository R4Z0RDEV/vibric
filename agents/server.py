"""
LangGraph WebSocket Server

FastAPI + WebSocket 기반 LangGraph 서버
Vibric 프론트엔드와 실시간 통신
"""

import asyncio
import json
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from langgraph.types import interrupt, Command

from agents.graph import app_graph
from agents.state import create_initial_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행"""
    print("[Server] LangGraph WebSocket Server starting...")
    yield
    print("[Server] Server shutting down...")


app = FastAPI(
    title="Vibric LangGraph Server",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """WebSocket 연결 관리"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")
    
    async def send_json(self, websocket: WebSocket, data: dict):
        await websocket.send_json(data)
    
    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """메인 WebSocket 엔드포인트"""
    await manager.connect(websocket)
    
    # 세션별 상태
    thread_id = f"session-{id(websocket)}"
    graph_state = create_initial_state()
    pending_interrupt = False
    
    try:
        while True:
            # 클라이언트 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "message":
                # 유저 메시지 처리
                content = message.get("content", "")
                print(f"[WS] User message: {content[:50]}...")
                
                # 상태 업데이트
                from langchain_core.messages import HumanMessage
                graph_state["messages"].append(HumanMessage(content=content))
                
                # 그래프 실행 (스트리밍)
                try:
                    async for event in app_graph.astream(
                        graph_state,
                        config={"configurable": {"thread_id": thread_id}},
                        stream_mode="values"
                    ):
                        # 현재 에이전트 확인
                        next_agent = event.get("next_agent", "")
                        
                        # Interrupt 확인 요청
                        if next_agent and not pending_interrupt:
                            # 에이전트 호출 전 확인 요청
                            await manager.send_json(websocket, {
                                "type": "interrupt",
                                "agent": next_agent,
                                "confirmation": {
                                    "agent": next_agent,
                                    "instruction": f"{next_agent} 에이전트를 호출합니다.",
                                    "alternatives": ["planner", "coder", "reviewer", "db_agent"]
                                }
                            })
                            pending_interrupt = True
                            break  # 확인 대기
                        
                        # 메시지 스트리밍
                        messages = event.get("messages", [])
                        if messages:
                            last_msg = messages[-1]
                            if hasattr(last_msg, "content"):
                                await manager.send_json(websocket, {
                                    "type": "message",
                                    "agent": next_agent,
                                    "content": last_msg.content
                                })
                        
                        # Artifacts 전송
                        artifacts = event.get("artifacts", {})
                        for path, artifact in artifacts.items():
                            if isinstance(artifact, dict) and "content" in artifact:
                                await manager.send_json(websocket, {
                                    "type": "artifact",
                                    "artifact": {
                                        "path": path,
                                        "content": artifact["content"]
                                    }
                                })
                    
                    # 실행 완료
                    if not pending_interrupt:
                        await manager.send_json(websocket, {
                            "type": "status",
                            "content": "completed"
                        })
                        
                except Exception as e:
                    print(f"[WS] Graph execution error: {e}")
                    await manager.send_json(websocket, {
                        "type": "error",
                        "error": str(e)
                    })
            
            elif msg_type == "confirm":
                # 에이전트 확인 응답
                confirm = message.get("confirm", False)
                alternative = message.get("alternativeAgent")
                
                pending_interrupt = False
                
                if confirm:
                    print(f"[WS] Agent confirmed")
                    # 그래프 계속 실행
                    # (실제 구현에서는 Command로 재개)
                else:
                    print(f"[WS] Agent rejected, alternative: {alternative}")
                    if alternative:
                        graph_state["next_agent"] = alternative
                
                await manager.send_json(websocket, {
                    "type": "status",
                    "content": "resumed"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Error: {e}")
        manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy", "connections": len(manager.active_connections)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
