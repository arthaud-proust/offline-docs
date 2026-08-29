import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { search, serveFile, SOURCES } from "./api.js";

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "docs-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, "http://localhost");

          if (url.pathname === "/sources") {
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(SOURCES));
          }

          if (url.pathname === "/search") {
            const q = (url.searchParams.get("q") || "").trim();
            const sources = (url.searchParams.get("sources") || "").split(",").filter(Boolean);
            const titlesOnly = url.searchParams.get("titlesOnly") !== "false";
            const data = q.length >= 2 ? await search(q, sources, titlesOnly) : [];
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(data));
          }

          if (url.pathname === "/file") {
            const { status, body, type } = await serveFile(url.searchParams.get("path") || "");
            res.statusCode = status;
            if (type) res.setHeader("Content-Type", type + "; charset=utf-8");
            return res.end(body);
          }

          next();
        });
      },
    },
  ],
  server: { port: 3457 },
});
