/**
 * Runs once when the server starts.
 *
 * Behind a corporate proxy (HTTPS_PROXY set), Node's built-in fetch on
 * Node < 22.21 ignores the proxy and direct outbound HTTPS times out. This
 * routes server-side fetch through the proxy, honouring NO_PROXY. Firestore
 * uses gRPC, which already reads the proxy env vars.
 *
 * On Vercel no proxy variable is set, so this does nothing there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return;

  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
  console.log(`[rewind] server fetch goes through proxy ${new URL(proxy).host}`);
}
