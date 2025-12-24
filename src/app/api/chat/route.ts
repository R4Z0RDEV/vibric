import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { SPEC_PROMPTS, FAST_MODE_PROMPT } from '@/constants/prompts';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages, mode, specStage, model } = await req.json();

        // 시스템 프롬프트 선택
        let systemPrompt = '';

        if (mode === 'spec') {
            switch (specStage) {
                case 'requirements':
                    systemPrompt = SPEC_PROMPTS.requirements;
                    break;
                case 'plan':
                    systemPrompt = SPEC_PROMPTS.plan;
                    break;
                case 'task':
                    systemPrompt = SPEC_PROMPTS.task;
                    break;
                default:
                    systemPrompt = SPEC_PROMPTS.requirements;
            }
        } else {
            // Fast Mode: XML 응답 형식 사용
            systemPrompt = FAST_MODE_PROMPT;
        }

        // 모델 선택: Gemini 3.0 Pro (Thinking 지원)
        const selectedModel = google('gemini-3-pro-preview');

        const result = streamText({
            model: selectedModel,
            system: systemPrompt,
            messages,
            // Gemini 3.0 Pro Thinking 설정
            providerOptions: {
                google: {
                    thinkingLevel: 'high', // 'low' | 'high' - high enables deep reasoning
                },
            },
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('[API /chat] Error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
