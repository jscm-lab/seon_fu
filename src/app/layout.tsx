import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미래사업팀 주간업무 대시보드",
  description: "프로젝트 현황 입력 + HWPX 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
