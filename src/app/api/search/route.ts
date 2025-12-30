/**
 * Tavily Search API Proxy
 * 
 * POST /api/search
 * Body: { query: string }
 */

import { NextRequest, NextResponse } from 'next/server';

interface TavilySearchResponse {
    query: string;
    results: Array<{
        title: string;
        url: string;
        content: string;
        score: number;
    }>;
}

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.TAVILY_API_KEY;

        if (!apiKey) {
            // API 키가 없으면 모의 응답 반환
            console.warn('[Search API] TAVILY_API_KEY not configured, returning mock response');
            return NextResponse.json({
                query,
                results: [
                    {
                        title: 'Mock Search Result',
                        url: 'https://example.com',
                        content: 'This is a mock search result because TAVILY_API_KEY is not configured.',
                        score: 1.0,
                    },
                ],
            });
        }

        // Tavily API 호출
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                search_depth: 'basic',
                include_answer: false,
                include_raw_content: false,
                max_results: 5,
                include_domains: [
                    'stackoverflow.com',
                    'github.com',
                    'developer.mozilla.org',
                    'reactjs.org',
                    'nextjs.org',
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Search API] Tavily API error:', errorText);
            throw new Error(`Tavily API error: ${response.status}`);
        }

        const data: TavilySearchResponse = await response.json();

        return NextResponse.json({
            query,
            results: data.results || [],
        });

    } catch (error) {
        console.error('[Search API] Error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Search failed',
                query: '',
                results: [],
            },
            { status: 500 }
        );
    }
}
