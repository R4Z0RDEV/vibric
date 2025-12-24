# Vibric 디자인 시스템

> **문서 버전**: 2.0  
> **최종 수정일**: 2024-12-23

---

## 1. 디자인 철학

Vibric의 디자인은 **Apple Liquid Glass** 스타일을 기반으로 합니다.

### 핵심 원칙
1. **다크 퍼스트**: 기본 다크 테마로 개발자 친화적 환경
2. **리퀴드 글래스**: Apple 스타일의 반투명 + 블러 + 빛 반사 효과
3. **미니멀리즘**: 불필요한 장식 최소화, 콘텐츠 중심
4. **일관성**: 모든 컴포넌트에 동일한 디자인 언어 적용

---

## 2. 컬러 팔레트

### 2.1 베이스 컬러 (Zinc 기반)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--background` | `#09090b` | 메인 배경 (zinc-950) |
| `--card` | `#18181b` | 카드, 패널 (zinc-900) |
| `--secondary` | `#27272a` | 호버, 활성 상태 (zinc-800) |
| `--border` | `#27272a` | 테두리 (zinc-800) |

### 2.2 텍스트 컬러

| 토큰 | 값 | 용도 |
|------|-----|------|
| `text-white` | `#ffffff` | 기본 텍스트 |
| `text-white/60` | `rgba(255,255,255,0.6)` | 보조 텍스트 |
| `text-white/50` | `rgba(255,255,255,0.5)` | 비활성 텍스트 |

### 2.3 액센트 컬러

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--accent` | `#3b82f6` | 주요 액센트 (blue-500) |
| `--accent-orange` | `#fb923c` | 크레딧, 알림 (orange-400) |
| `--destructive` | `#ef4444` | 위험, 삭제 (red-500) |

---

## 3. Liquid Glass 시스템

### 3.1 CSS 변수

```css
/* Liquid Glass 토큰 */
--liquid-glass-bg: rgba(0, 0, 0, 0.2);
--liquid-glass-bg-light: rgba(255, 255, 255, 0.025);
--liquid-glass-border: rgba(255, 255, 255, 0.5);
--liquid-glass-border-subtle: rgba(255, 255, 255, 0.3);
--liquid-glass-shadow: 
  inset 0 1px 0px rgba(255, 255, 255, 0.75),
  0 0 9px rgba(0, 0, 0, 0.2),
  0 3px 8px rgba(0, 0, 0, 0.15);
--liquid-glass-highlight-from: rgba(255, 255, 255, 0.6);
--liquid-glass-highlight-to: rgba(255, 255, 255, 0.3);
```

### 3.2 유틸리티 클래스

| 클래스 | 용도 | 효과 |
|--------|------|------|
| `liquid-glass` | 기본 컨테이너 | 풀 글래스 + 빛 그라데이션 |
| `liquid-glass-button` | 버튼 | 호버 시 bg-white/30 |
| `liquid-glass-card` | 카드 | 호버 효과 포함 |
| `liquid-glass-input` | 입력 필드 | 포커스 링 포함 |
| `liquid-glass-subtle` | 헤더, 탭바 | 얇은 효과 |
| `liquid-glass-pill` | 둥근 버튼 | border-radius: 9999px |
| `liquid-glass-toolbar` | 플로팅 툴바 | padding + gap 포함 |
| `liquid-glass-content` | 콘텐츠 래퍼 | z-index: 10 |

### 3.3 사용 예시

```tsx
// 기본 글래스 컨테이너
<div className="liquid-glass rounded-xl p-4">
  <div className="liquid-glass-content">
    <p className="text-white">Content</p>
  </div>
</div>

// 글래스 버튼
<button className="liquid-glass-button rounded-lg px-4 py-2">
  <span className="relative z-10 text-white">Click me</span>
</button>

// 호버 가능한 카드
<div className="liquid-glass-card rounded-xl p-6">
  <h3 className="relative z-10 text-white">Title</h3>
</div>
```

---

## 4. 타이포그래피

### 4.1 폰트 패밀리

| 용도 | 폰트 | CSS 변수 |
|------|------|----------|
| UI 전체 | Inter | `--font-inter` |
| 코드, 터미널 | JetBrains Mono | `--font-jetbrains-mono` |

### 4.2 폰트 사이즈 스케일

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `text-xs` | 12px | 캡션, 메타데이터 |
| `text-sm` | 14px | 본문, 버튼 |
| `text-base` | 16px | 제목, 강조 |
| `text-lg` | 18px | 섹션 제목 |
| `text-xl` | 20px | 페이지 제목 |

---

## 5. 컴포넌트 스타일

### 5.1 글래스 버튼

```tsx
<button className="
  liquid-glass-button 
  rounded-lg 
  px-3 py-1.5 
  flex items-center gap-1.5 
  text-white text-sm font-medium
">
  <Icon className="w-4 h-4 relative z-10" />
  <span className="relative z-10">Label</span>
</button>
```

### 5.2 글래스 입력

```tsx
<div className="liquid-glass rounded-xl">
  <textarea className="
    w-full px-4 py-3
    bg-transparent text-white text-sm
    placeholder:text-white/60
    resize-none outline-none
    relative z-10
  " />
</div>
```

### 5.3 탭 스타일

```tsx
<button className={`
  relative px-4 py-3
  font-medium text-sm
  transition-all duration-300
  ${active 
    ? 'text-white' 
    : 'text-white/50 hover:text-white/80'
  }
`}>
  <span className="relative z-10">{label}</span>
  {active && (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
  )}
</button>
```

---

## 6. 특수 UI 패턴

### 6.1 도트 그리드 배경

```css
.dot-grid {
  background-image: radial-gradient(
    circle,
    rgba(161, 161, 170, 0.15) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
}
```

### 6.2 플로팅 툴바

```tsx
<div className="
  liquid-glass-toolbar 
  rounded-lg
  fixed bottom-6 left-1/2 -translate-x-1/2
  z-50
">
  {/* 버튼들 */}
</div>
```

### 6.3 메시지 버블

```tsx
<div className="
  liquid-glass-subtle
  rounded-2xl rounded-tl-md
  px-4 py-2.5
  bg-white/5
">
  <p className="text-sm text-white relative z-10">
    {message}
  </p>
</div>
```

---

## 7. 애니메이션

### 7.1 트랜지션 기본값

```css
transition-all duration-300 ease
```

### 7.2 호버 효과

```css
/* Liquid Glass 버튼 */
hover:bg-white/30

/* 텍스트 */
hover:text-white
```

### 7.3 키프레임 애니메이션

| 클래스 | 효과 |
|--------|------|
| `animate-fade-in` | 0.2s 페이드 인 |
| `animate-slide-up` | 0.3s 슬라이드 업 |
| `animate-pulse-subtle` | 2s 미묘한 펄스 |
| `animate-shimmer` | 2s 쉬머 효과 |

---

## 8. z-index 가이드

Liquid Glass 컴포넌트 사용 시 `::before`, `::after` 가상 요소가 그라데이션 오버레이로 사용됩니다.  
**콘텐츠는 반드시 `relative z-10`을 적용해야 합니다.**

```tsx
<div className="liquid-glass">
  {/* 이 콘텐츠는 오버레이 아래에 숨겨짐 */}
  <p>Wrong</p>
  
  {/* 이 콘텐츠는 올바르게 표시됨 */}
  <p className="relative z-10">Correct</p>
</div>
```

또는 `liquid-glass-content` 유틸리티 사용:

```tsx
<div className="liquid-glass">
  <div className="liquid-glass-content">
    <p>All content here is properly layered</p>
  </div>
</div>
```

---

## 9. 접근성

### 9.1 색상 대비
- 모든 텍스트는 WCAG AA 기준 충족 (4.5:1 이상)
- `text-white`는 다크 배경에서 충분한 대비 제공

### 9.2 포커스 인디케이터

```css
focus:ring-2 focus:ring-white/30 focus:outline-none
```

---

**문서 끝**
