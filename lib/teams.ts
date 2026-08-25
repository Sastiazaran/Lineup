import { SportKey } from "@/lib/constants";

export const TEAM_ROSTERS: Record<SportKey, string[]> = {
  [SportKey.Mlb]: [
    "Arizona Diamondbacks",
    "Atlanta Braves",
    "Athletics",
    "Baltimore Orioles",
    "Boston Red Sox",
    "Chicago Cubs",
    "Chicago White Sox",
    "Cincinnati Reds",
    "Cleveland Guardians",
    "Colorado Rockies",
    "Detroit Tigers",
    "Houston Astros",
    "Kansas City Royals",
    "Los Angeles Angels",
    "Los Angeles Dodgers",
    "Miami Marlins",
    "Milwaukee Brewers",
    "Minnesota Twins",
    "New York Mets",
    "New York Yankees",
    "Philadelphia Phillies",
    "Pittsburgh Pirates",
    "San Diego Padres",
    "San Francisco Giants",
    "Seattle Mariners",
    "St. Louis Cardinals",
    "Tampa Bay Rays",
    "Texas Rangers",
    "Toronto Blue Jays",
    "Washington Nationals",
  ],
  [SportKey.Nba]: [
    "Atlanta Hawks",
    "Boston Celtics",
    "Brooklyn Nets",
    "Charlotte Hornets",
    "Chicago Bulls",
    "Cleveland Cavaliers",
    "Dallas Mavericks",
    "Denver Nuggets",
    "Detroit Pistons",
    "Golden State Warriors",
    "Houston Rockets",
    "Indiana Pacers",
    "Los Angeles Clippers",
    "Los Angeles Lakers",
    "Memphis Grizzlies",
    "Miami Heat",
    "Milwaukee Bucks",
    "Minnesota Timberwolves",
    "New Orleans Pelicans",
    "New York Knicks",
    "Oklahoma City Thunder",
    "Orlando Magic",
    "Philadelphia 76ers",
    "Phoenix Suns",
    "Portland Trail Blazers",
    "Sacramento Kings",
    "San Antonio Spurs",
    "Toronto Raptors",
    "Utah Jazz",
    "Washington Wizards",
  ],
  [SportKey.Epl]: [
    "Arsenal",
    "Aston Villa",
    "Bournemouth",
    "Brentford",
    "Brighton and Hove Albion",
    "Burnley",
    "Chelsea",
    "Crystal Palace",
    "Everton",
    "Fulham",
    "Leeds United",
    "Liverpool",
    "Manchester City",
    "Manchester United",
    "Newcastle United",
    "Nottingham Forest",
    "Sunderland",
    "Tottenham Hotspur",
    "West Ham United",
    "Wolverhampton Wanderers",
  ],
  [SportKey.LaLiga]: [
    "Alaves",
    "Athletic Club",
    "Atletico Madrid",
    "Barcelona",
    "Celta Vigo",
    "Elche",
    "Espanyol",
    "Getafe",
    "Girona",
    "Levante",
    "Mallorca",
    "Osasuna",
    "Rayo Vallecano",
    "Real Betis",
    "Real Madrid",
    "Real Oviedo",
    "Real Sociedad",
    "Sevilla",
    "Valencia",
    "Villarreal",
  ],
  [SportKey.LigaMx]: [
    "Atletico San Luis",
    "Atlas",
    "Club America",
    "Club Leon",
    "Club Tijuana",
    "Cruz Azul",
    "FC Juarez",
    "Guadalajara",
    "Mazatlan FC",
    "Monterrey",
    "Necaxa",
    "Pachuca",
    "Puebla",
    "Pumas UNAM",
    "Queretaro",
    "Santos Laguna",
    "Tigres UANL",
    "Toluca",
  ],
};

/**
 * Collapses team names so "Club America" and "América" can still match odds feeds.
 */
export function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|c\.f\.|club|de|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * True when two labels refer to the same club, including shortened API names.
 */
export function teamsMatch(a: string, b: string): boolean {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

/**
 * Merges the static roster with live event participants so quiet seasons still have a picker.
 */
export function mergeTeamList(seed: string[], liveNames: string[]): string[] {
  const merged = [...seed];
  for (const name of liveNames) {
    if (!merged.some((existing) => teamsMatch(existing, name))) {
      merged.push(name);
    }
  }
  return merged.sort((a, b) => a.localeCompare(b));
}
