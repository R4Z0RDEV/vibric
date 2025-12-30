# Internal UI Design System Tool 설계
> **작성일**: 2024-12-25
> **상태**: 초안 (User Review Pending)

## 1. 개요
AI의 부족한 디자인 감각과 "Vanilla JS Only" 제약 사이의 딜레마를 해결하기 위해, **'내장형 디자인 시스템 도구(Internal UI Design MCP)'**를 도입합니다.
AI가 디자인을 매번 새로 '생성'하는 대신, 검증된 고품질의 Shadcn-style Vanilla 컴포넌트를 '조회'하여 사용하도록 합니다.

## 2. 아키텍처

### 2.1 Component Library (`src/lib/design-system/`)
Shadcn UI의 컴포넌트들을 Pure HTML/CSS로 포팅하여 저장합니다.

```typescript
// src/lib/design-system/components.ts
export const COMPONENTS = {
  'button': {
    html: `<button class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
      {{text}}
    </button>`,
    css: `/* Tailwind Utility 기반이므로 별도 CSS 최소화 */`
  },
  'card': {
    html: `<div class="rounded-lg border bg-card text-card-foreground shadow-sm" data-v0-t="card">
      <div class="flex flex-col space-y-1.5 p-6">
        <h3 class="text-2xl font-semibold leading-none tracking-tight">{{title}}</h3>
        <p class="text-sm text-muted-foreground">{{description}}</p>
      </div>
      <div class="p-6 pt-0">{{content}}</div>
    </div>`
  }
  // ... inputs, dialogs, navbars
};
```

### 2.2 Global Styles Injection (`src/lib/design-system/globals.ts`)
모든 프로젝트의 `styles.css`에 주입될 기본 스타일입니다. Shadcn의 핵심 변수(Variables)를 포함합니다.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --radius: 0.5rem;
  /* ... modern reset & variables */
}
```

### 2.3 Chat API Integration (`src/app/api/chat/route.ts`)
Vercel AI SDK의 `tools` 기능을 사용하여 AI에게 컴포넌트 조회 능력을 부여합니다.

```typescript
const result = streamText({
  model: google('gemini-3-pro-preview'),
  tools: {
    getComponent: {
      description: 'Get the HTML/CSS for a specific UI component (e.g., button, card, navbar). ALWAYS use this when asked to build UI.',
      parameters: z.object({
        name: z.enum(['button', 'card', 'input', 'navbar', 'hero', 'login-form', ...]),
      }),
      execute: async ({ name }) => {
        return COMPONENTS[name];
      },
    },
    getGlobalStyles: {
      description: 'Get the mandatory global CSS variables and reset styles. Must include this in styles.css.',
      parameters: z.object({}),
      execute: async () => GLOBAL_STYLES,
    }
  },
  // ...
});
```

## 3. 프롬프트 엔지니어링

`FAST_MODE_PROMPT`와 `SPEC_PROMPTS`를 수정하여 다음 규칙을 강제합니다.

1.  **Mandatory Tool Usage**: "UI를 구현할 때는 반드시 `getComponent` 도구를 사용하여 표준 컴포넌트를 가져오세요. 직접 HTML을 작성하지 마세요."
2.  **Global Styles**: "새 프로젝트를 시작할 때 `getGlobalStyles`를 호출하여 `styles.css`를 초기화하세요."
3.  **Composition**: "도구에서 가져온 컴포넌트 HTML을 조립(Assemble)하여 페이지를 완성하세요."

## 4. 구현 단계 (Phases)

### Phase 1: Core Foundation
- [ ] `src/lib/design-system` 디렉토리 구조 생성
- [ ] `globals.ts` (CSS Variables, Reset) 구현
- [ ] `components.ts` (Button, Input, Card, Label) 구현

### Phase 2: API Integration
- [ ] `src/app/api/chat/route.ts`에 `tools` 정의 추가
- [ ] `prompts.ts` 시스템 프롬프트 업데이트 (Tool 사용 강제)

### Phase 3: Advanced Components
- [ ] Layouts (Navbar, Sidebar, Footer)
- [ ] Forms (Login, Register, Contact)
- [ ] Hero Sections (Landing Page components)

## 5. 기대 효과
- **일관성**: 모든 생성 결과물이 Shadcn UI 수준의 퀄리티 유지
- **안정성**: 검증된 HTML/CSS 구조 사용으로 레이아웃 깨짐 방지
- **Vanilla 준수**: React/npm 없이도 "Modern Web App" 느낌 구현 가능
