import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone: 런타임 이미지에 최소 의존성만 담아 이미지 크기를 대폭 축소한다
  // (node_modules 통째 복사 방지 → EC2 디스크 압박·no space 배포 실패 해소).
  output: "standalone",
};

export default nextConfig;
