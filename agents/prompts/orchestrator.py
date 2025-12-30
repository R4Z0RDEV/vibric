"""
Orchestrator 프롬프트

LLM 기반 동적 라우팅을 위한 프롬프트 정의
"""

# === Orchestrator 시스템 프롬프트 ===

ORCHESTRATOR_SYSTEM_PROMPT = """프로젝트 오케스트레이터. JSON으로만 응답하세요.

## 사용 가능한 에이전트
{agent_registry}

## 규칙
1. 코드 작성 후 반드시 reviewer 검증
2. 불필요한 설명 금지 - JSON만 출력"""


# === 실행 계획 생성 프롬프트 ===

CREATE_PLAN_PROMPT = """## 현재 상황
사용자 요청: {user_request}
프로젝트 컨텍스트: {project_context}

## 작업
위 요청을 완료하기 위한 실행 계획을 JSON 형식으로 작성하세요.

## 출력 형식 (JSON)
```json
{{
    "goal": "달성하려는 목표를 한 문장으로",
    "required_agents": ["필요한 에이전트 이름 목록"],
    "steps": [
        {{
            "step_number": 1,
            "agent": "에이전트 이름",
            "instruction": "이 에이전트에게 지시할 구체적인 내용",
            "expected_output": "예상되는 산출물"
        }}
    ]
}}
```

## 규칙
1. 복잡한 요청은 최소 3단계 이상으로 분해하세요
2. 코드 작성 후에는 반드시 reviewer를 포함하세요
3. 각 단계의 instruction은 구체적이어야 합니다
4. 불필요한 단계는 포함하지 마세요

실행 계획을 JSON으로 출력하세요:"""


# === 다음 단계 결정 프롬프트 ===

DECIDE_NEXT_STEP_PROMPT = """## 현재 상황
목표: {goal}
완료된 단계: {completed_steps}
현재 산출물: {artifacts_summary}
최근 품질 검증: {quality_check_summary}
반복 횟수: {iteration_count} / {max_iterations}

## 에이전트별 최근 결과
{agent_results}

## 작업
다음 행동을 결정하세요.

## 출력 형식 (JSON)
다음 중 하나를 선택하여 JSON으로 출력하세요:

1. 에이전트 호출:
```json
{{"action": "call_agent", "agent": "에이전트이름", "instruction": "구체적인 지시사항"}}
```

2. 품질 검증 요청:
```json
{{"action": "verify", "checker": "reviewer", "target": "검증할 산출물"}}
```

3. 수정 요청 (품질 검증 실패 시):
```json
{{"action": "refine", "agent": "수정할 에이전트", "feedback": "수정 내용"}}
```

4. 작업 완료:
```json
{{"action": "finish", "summary": "완료 요약"}}
```

## 규칙
1. 품질 검증이 실패하면 반드시 refine을 선택하세요
2. 최대 반복 횟수에 도달하면 finish를 선택하세요
3. 모든 단계가 완료되고 품질 검증을 통과하면 finish를 선택하세요

다음 행동을 JSON으로 출력하세요:"""


# === 에이전트 지시 프롬프트 템플릿 ===

AGENT_INSTRUCTION_TEMPLATE = """## 작업 지시
{instruction}

## 이전 작업 결과
{previous_artifacts}

## 규칙
1. 주어진 지시사항을 정확히 따르세요
2. 결과물은 명확하고 구조화된 형태로 제공하세요
3. 불확실한 부분이 있으면 명시하세요

작업을 수행하세요:"""
