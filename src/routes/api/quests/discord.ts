import { createFileRoute } from "@tanstack/react-router";
import { attachDiscord, readWallet } from "@/game/quests.server";

function discordAge(id: string) {
  try {
    return Number((BigInt(id) >> 22n) + 1420070400000n);
  } catch {
    return Date.now();
  }
}

async function tokenOf(code: string, redirect: string) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as { access_token?: string };
}

export const Route = createFileRoute("/api/quests/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const wallet = readWallet();
        const redirect = `${url.origin}/api/quests/discord`;
        const code = url.searchParams.get("code");
        if (!wallet) return Response.redirect(`${url.origin}/quests`, 302);
        if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
          return Response.redirect(`${url.origin}/quests`, 302);
        }
        if (!code) {
          const auth = new URL("https://discord.com/api/oauth2/authorize");
          auth.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
          auth.searchParams.set("redirect_uri", redirect);
          auth.searchParams.set("response_type", "code");
          auth.searchParams.set("scope", "identify");
          return Response.redirect(auth.toString(), 302);
        }
        const token = await tokenOf(code, redirect);
        if (!token?.access_token) return Response.redirect(`${url.origin}/quests`, 302);
        const me = await fetch("https://discord.com/api/users/@me", {
          headers: { authorization: `Bearer ${token.access_token}` },
        });
        if (!me.ok) return Response.redirect(`${url.origin}/quests`, 302);
        const user = (await me.json()) as { id?: string; username?: string };
        if (!user.id) return Response.redirect(`${url.origin}/quests`, 302);
        if (Date.now() - discordAge(user.id) < 30 * 86400000) return Response.redirect(`${url.origin}/quests`, 302);
        let joined = false;
        let role = false;
        const guild = process.env.DISCORD_GUILD_ID;
        const bot = process.env.DISCORD_BOT_TOKEN;
        if (guild && bot) {
          const member = await fetch(`https://discord.com/api/guilds/${guild}/members/${user.id}`, {
            headers: { authorization: `Bot ${bot}` },
          });
          if (member.ok) {
            joined = true;
            const body = (await member.json()) as { roles?: string[] };
            role = Boolean(process.env.DISCORD_VERIFY_ROLE_ID && body.roles?.includes(process.env.DISCORD_VERIFY_ROLE_ID));
          }
        }
        await attachDiscord(wallet, user.id, user.username ?? "", joined, role);
        return Response.redirect(`${url.origin}/quests`, 302);
      },
    },
  },
});
