// Basic type definitions

export interface Student {
    id: string;
    name: string;
    cookies: number;
}

export interface ClassInfo {
    id: string;
    name: string;
}

// Dahandin API Types
export interface DahandinResponse<T> {
    result: boolean;
    message: string;
    data?: T;
}

export interface DahandinBadge {
    imgUrl: string;
    title: string;
    hasBadge: boolean;
}

export interface DahandinStudent {
    code: string;
    number: number;
    name: string;
    cookie: number;
    usedCookie: number;
    totalCookie: number;
    chocoChips: number;
    badges: Record<string, DahandinBadge>;
}

export interface DahandinClass {
    code: string; // Add ID/Code for the class
    name: string;
    totalCookies: number;
    cookies: number;
    usedCookies: number;
}
