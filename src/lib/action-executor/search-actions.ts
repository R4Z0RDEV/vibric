/**
 * Search Actions - 웹 검색 (Tavily API)
 */

import type { ActionResult, WebSearchAction, TavilySearchResult } from './types';

/**
 * 검색 액션 실행
 */
export async function executeSearchAction(
    action: WebSearchAction
): Promise<ActionResult> {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: action.query }),
        });

        if (!response.ok) {
            throw new Error(`Search API failed: ${response.status}`);
        }

        const data: TavilySearchResult = await response.json();

        // 검색 결과를 읽기 쉬운 형식으로 변환
        const formattedOutput = data.results
            .slice(0, 5) // 상위 5개 결과만
            .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content.slice(0, 200)}...`)
            .join('\n\n');

        return {
            success: true,
            action,
            output: formattedOutput || 'No results found',
            data,
        };
    } catch (error) {
        return {
            success: false,
            action,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
