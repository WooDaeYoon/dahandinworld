export const getProxyImageUrl = (url: string | undefined): string => {
    if (!url) return '';

    // Do not proxy data URIs or blob URLs (like local previews)
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
        return url;
    }

    // Pass through Next.js Image Optimizer API to bypass client-side firewalls
    // Using a default width of 384 for shop items (a reasonable balance for quality/speed)
    // You can adjust w=... if you need higher resolution. valid widths: 16, 32, 48, 64, 96, 128, 256, 384, 512, 1080...
    return `/_next/image?url=${encodeURIComponent(url)}&w=384&q=75`;
};
