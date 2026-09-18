export async function register() {
  // Only trust the local mkcert CA during local development.
  // In production the auth service uses a real public certificate,
  // and the mkcert binary is not present on the host.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development"
  ) {
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
