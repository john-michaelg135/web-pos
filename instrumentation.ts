export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const fs = await import("fs");
    const { execSync } = await import("child_process");
    const { setGlobalDispatcher, Agent } = await import("undici");

    try {
      const caRoot = execSync("mkcert -CAROOT").toString().trim();
      const caCertPath = `${caRoot}/rootCA.pem`;

      if (fs.existsSync(caCertPath)) {
        const ca = fs.readFileSync(caCertPath);

        setGlobalDispatcher(
          new Agent({
            connect: {
              ca,
            },
          }),
        );

        console.log(
          "[instrumentation] Registered mkcert CA for outbound fetch requests",
        );
      } else {
        console.warn(
          "[instrumentation] mkcert CA not found at:", caCertPath,
          "— HTTPS calls to local services may fail",
        );
      }
    } catch (error) {
      console.warn(
        "[instrumentation] mkcert not available — skipping CA registration.",
        "Set NODE_TLS_REJECT_UNAUTHORIZED=0 as a fallback for local dev.",
      );
    }
  }
}
