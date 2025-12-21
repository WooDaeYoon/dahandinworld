import { NextRequest, NextResponse } from 'next/server';

const TARGET_BASE_URL = 'https://api.dahandin.com/openapi/v1';

export async function GET(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    // Remove '/api/proxy/' to get the target path
    // e.g., /api/proxy/get/student/list -> get/student/list
    const proxyPath = pathname.replace(/^\/api\/proxy\//, '');
    const searchParams = request.nextUrl.searchParams.toString();
    const apiKey = request.headers.get('X-API-Key');

    const targetUrl = `${TARGET_BASE_URL}/${proxyPath}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`Proxying to: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey || '',
                'Content-Type': 'application/json',
            },
            cache: 'no-store' // Don't cache API demands
        });

        if (!response.ok) {
            console.error(`Proxy response error: ${response.status} ${response.statusText}`);
            return NextResponse.json({ error: `Upstream error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy internal error:', error);
        return NextResponse.json({ error: 'Proxy Request Failed', details: String(error) }, { status: 500 });
    }
}
