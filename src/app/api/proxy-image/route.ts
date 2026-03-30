import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Basic security check to prevent abuse of the proxy
    if (!url.startsWith('https://firebasestorage.googleapis.com')) {
        return new NextResponse('Invalid URL domain', { status: 403 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const headers = new Headers();

        // Forward content type
        const contentType = response.headers.get('content-type') || 'image/png';
        headers.set('Content-Type', contentType);

        // Strong Cache-Control to reduce bandwidth and speed up loading
        // 1 year cache on CDN edge (s-maxage) and browser (max-age)
        headers.set('Cache-Control', 'public, s-maxage=31536000, max-age=31536000, immutable');

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return new NextResponse('Internal Server Error fetching image', { status: 500 });
    }
}
