import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://fundamental-investor-ai.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/trade", "/trade/leaderboard"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
