'use client';

import React from 'react';

export default function GuideButton() {
  return (
    <a
      href="/assets/guide/guide.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-12 left-4 flex items-center justify-center gap-2 bg-blue-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-600 hover:shadow-xl transition-all z-50 font-bold group"
      aria-label="다했니월드 가이드 PDF"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">📖</span>
      <span>가이드 PDF 보기</span>
    </a>
  );
}
