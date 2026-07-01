import { SignJWT, importPKCS8 } from "jose";
import * as http2 from "http2";

// APNs endpoint: sandbox for debug/TestFlight, production for App Store
const HOST =
  process.env.APNS_ENV === "production"
    ? "api.push.apple.com"
    : "api.sandbox.push.apple.com";

// APNs JWT is valid for 60 min; reuse within 55 min
let jwtCache: { token: string; exp: number } | null = null;

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (jwtCache && jwtCache.exp > now) return jwtCache.token;

  // Vercel stores multiline env vars with literal \n — restore them
  const pem = (process.env.APNS_KEY ?? "").replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(pem, "ES256");

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APNS_KEY_ID ?? "" })
    .setIssuer(process.env.APNS_TEAM_ID ?? "")
    .setIssuedAt(now)
    .sign(privateKey);

  jwtCache = { token, exp: now + 55 * 60 };
  return token;
}

/**
 * Send an APNs push notification.
 * Never throws — failure is logged but must not break the caller.
 */
export async function sendPush(
  deviceToken: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const jwt = await getApnsJwt();
    const bundleId = process.env.APNS_BUNDLE_ID ?? "";
    const payloadStr = JSON.stringify({
      aps: { alert: { title, body }, sound: "default" },
    });

    await new Promise<void>((resolve, reject) => {
      const client = http2.connect(`https://${HOST}`);
      client.on("error", (err) => {
        client.destroy();
        reject(err);
      });

      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        ":authority": HOST,
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payloadStr),
      });

      let statusCode = 0;
      let resBody = "";

      req.on("response", (headers) => {
        statusCode = headers[":status"] as number;
      });
      req.on("data", (chunk: Buffer) => {
        resBody += chunk.toString();
      });
      req.on("end", () => {
        client.close();
        if (statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`APNs ${statusCode}: ${resBody}`));
        }
      });
      req.on("error", (err) => {
        client.destroy();
        reject(err);
      });

      req.write(payloadStr);
      req.end();
    });

    console.log(
      `[sendPush] ok → ${deviceToken.slice(0, 8)}... (${HOST})`,
    );
  } catch (err) {
    console.error("[sendPush] failed:", err);
    // Never re-throw — push failure must not break diary save or notification insert
  }
}
