import { Brand } from "@/lib/constants";
import type { DigestContent, GamePreview, RecommendedBet } from "@/lib/recommend";

export type DigestEmailProps = {
  appUrl: string;
  unsubscribeUrl: string;
  digest: DigestContent;
};

function formatOdds(value: number): string {
  return value.toFixed(2);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSpread(line: { point?: number; decimalOdds: number } | null): string {
  if (!line || typeof line.point !== "number") {
    return "—";
  }
  const point = line.point > 0 ? `+${line.point}` : String(line.point);
  return `${point} (${formatOdds(line.decimalOdds)})`;
}

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function opponentOf(pick: RecommendedBet): string {
  return pick.teamName === pick.event.home_team ? pick.event.away_team : pick.event.home_team;
}

/**
 * Builds HTML + text bodies for the daily favorite-team digest.
 */
export function renderDigestEmail({ appUrl, unsubscribeUrl, digest }: DigestEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const pick = digest.recommendation;
  const subject = pick
    ? `${Brand.Name}: ${pick.teamName} to win vs ${opponentOf(pick)}`
    : `${Brand.Name}: your games`;

  return {
    subject,
    html: htmlTemplate(appUrl, unsubscribeUrl, digest),
    text: textTemplate(appUrl, unsubscribeUrl, digest),
  };
}

function htmlTemplate(appUrl: string, unsubscribeUrl: string, digest: DigestContent): string {
  const pick = digest.recommendation;
  const gamesHtml = digest.games.map(gameRow).join("");
  const hero = pick
    ? `
      <tr>
        <td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c6f26d;">
          Recommended bet
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:1.1;color:#f4f7ef;font-weight:700;">
          ${escapeHtml(pick.teamName)} to win
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#d5e4d2;">
          vs ${escapeHtml(opponentOf(pick))} · ${escapeHtml(pick.event.sport_title)}<br/>
          ML ${formatOdds(pick.moneyline.decimalOdds)} (${formatPercent(pick.moneyline.impliedProbability)} implied)
          · Spread ${escapeHtml(formatSpread(pick.spread))}
          <br/>${escapeHtml(formatKickoff(pick.event.commence_time))}
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#0d3b24;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0d3b24;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#122017;color:#f4f7ef;">
            <tr>
              <td style="padding:28px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#c6f26d;">
                ${Brand.Name}
              </td>
            </tr>
            ${hero}
            <tr>
              <td style="padding:8px 28px 12px;font-family:Georgia,serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#c6f26d;">
                Your games
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${gamesHtml}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#9fb39a;">
                <a href="${escapeHtml(appUrl)}" style="color:#c6f26d;">Manage favorites</a>
                ·
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9fb39a;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function gameRow(game: GamePreview): string {
  const homeMl = game.lines.find((line) => line.name === game.event.home_team);
  const awayMl = game.lines.find((line) => line.name === game.event.away_team);
  const draw = game.lines.find((line) => line.name.toLowerCase() === "draw");
  const homeSpread = game.spreads.find((line) => line.name === game.event.home_team);
  const awaySpread = game.spreads.find((line) => line.name === game.event.away_team);

  return `
    <tr>
      <td style="padding:14px 0;border-top:1px solid #1f4630;font-family:Arial,Helvetica,sans-serif;color:#f4f7ef;">
        <div style="font-size:12px;color:#9fb39a;margin-bottom:6px;">
          ${escapeHtml(game.event.sport_title)} · ${escapeHtml(formatKickoff(game.event.commence_time))}
        </div>
        <div style="font-size:16px;font-weight:700;">${escapeHtml(game.event.away_team)} at ${escapeHtml(game.event.home_team)}</div>
        <div style="font-size:14px;margin-top:8px;color:#d5e4d2;">
          ${escapeHtml(game.event.away_team)} ML ${homeOrDash(awayMl)} · spread ${escapeHtml(formatSpread(awaySpread ?? null))}<br/>
          ${escapeHtml(game.event.home_team)} ML ${homeOrDash(homeMl)} · spread ${escapeHtml(formatSpread(homeSpread ?? null))}
          ${draw ? `<br/>Draw ML ${formatOdds(draw.decimalOdds)}` : ""}
        </div>
      </td>
    </tr>`;
}

function homeOrDash(line: { decimalOdds: number } | undefined): string {
  return line ? formatOdds(line.decimalOdds) : "—";
}

function textTemplate(appUrl: string, unsubscribeUrl: string, digest: DigestContent): string {
  const pick = digest.recommendation;
  const lines = [
    Brand.Name.toUpperCase(),
    "",
    pick
      ? `Recommended bet: ${pick.teamName} to win vs ${opponentOf(pick)} (ML ${formatOdds(pick.moneyline.decimalOdds)}, spread ${formatSpread(pick.spread)})`
      : "No recommended bet this window.",
    "",
    "Your games",
  ];
  for (const game of digest.games) {
    lines.push(
      `${game.event.away_team} at ${game.event.home_team} — ${formatKickoff(game.event.commence_time)}`,
    );
  }
  lines.push("", `Manage favorites: ${appUrl}`, `Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
