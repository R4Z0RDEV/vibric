# AI 간 통신 토큰 최적화 설계

## 개요

멀티 에이전트 시스템에서 AI끼리 소통할 때 불필요한 토큰 낭비를 줄이기 위한 최적화 설계.

## 목표

- 전체 토큰 사용량 **90% 절감**
- JSON 스키마 강제로 파싱 안정성 확보
- 유저에게 보여주는 메시지는 그대로 유지

## 최적화 영역

### 1. 에이전트 출력 - JSON 스키마 강제

```python
# Planner 출력
{
  "goal": "로그인 페이지 구현",
  "steps": [{"agent": "coder", "task": "LoginForm 컴포넌트"}]
}

# Coder 출력
{
  "files": [{"path": "login.tsx", "content": "..."}],
  "summary": "한 줄 요약"
}

# Reviewer 출력
{
  "verdict": "pass",  // "pass" | "fail"
  "issues": [],
  "summary": "LGTM"
}
```

### 2. Orchestrator 지시 간소화

```python
# 현재 (비효율)
"[Orchestrator] 다음 작업을 수행해주세요. 로그인 폼을..."

# 최적화
{"action": "call_agent", "agent": "coder", "task": "LoginForm 구현"}
```

### 3. Artifacts 전달 최적화

```python
# 현재: 전체 내용 전달 (수천 토큰)
state.artifacts = {"login.tsx": {"content": "... 300줄 ..."}}

# 최적화: 요약만 전달 (100토큰 미만)
state.artifacts = {
  "login.tsx": {
    "summary": "LoginForm 컴포넌트",
    "path": "/tmp/artifacts/login.tsx"
  }
}
```

## 예상 절감

| 영역 | 현재 | 최적화 후 | 절감률 |
|------|------|----------|--------|
| 에이전트 출력 | 500-1000 | 100-200 | 80% |
| Orchestrator 지시 | 200 | 50 | 75% |
| Artifacts 전달 | 2000+ | 100 | 95% |

## 구현 순서

1. 에이전트 프롬프트 JSON 스키마 적용
2. Orchestrator 지시 형식 변경
3. Artifacts 저장 방식 변경 (파일 + 요약)
