// Deletes the signed-in user's account. Needs the service role, so it can't run in the browser.
// All of the user's rows go with them (every table uses ON DELETE CASCADE).
import { adminClient, getUser, json, preflight } from "./common.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: "Please sign in again." }, 401);

  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("delete-account failed", error.message);
    return json({ error: "Couldn't delete the account. Try again." }, 500);
  }
  return json({ ok: true });
});
