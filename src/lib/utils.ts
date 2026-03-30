export const getProxyImageUrl = (url: string | undefined): string => {
    if (!url) return '';

    // Do not proxy data URIs or blob URLs (like local previews)
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
        return url;
    }

    // 커스텀 프록시 API를 통과시켜 학교 방화벽 및 Vercel 402(과금) 에러 한도 1000장 우회 
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};
