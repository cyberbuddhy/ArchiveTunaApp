export interface AutocompleteItem {
  name: string;
  category: "Artist" | "Band" | "Genre";
  country?: string;
  hint?: string;
}

export const POPULAR_SUGGESTIONS: AutocompleteItem[] = [
  // User specific and highly requested artists
  { name: "Mac Miller", category: "Artist", country: "United States" },
  { name: "Mac DeMarco", category: "Artist", country: "Canada" },
  { name: "Geese", category: "Band", country: "United States" },
  { name: "Tame Impala", category: "Band", country: "Australia" },
  { name: "Luis Alberto Spinetta", category: "Artist", country: "Argentina", hint: "Spinetta" },
  { name: "Spinetta Jade", category: "Band", country: "Argentina" },
  { name: "Pescado Rabioso", category: "Band", country: "Argentina" },
  { name: "Almendra", category: "Band", country: "Argentina" },
  { name: "Soda Stereo", category: "Band", country: "Argentina" },
  { name: "Gustavo Cerati", category: "Artist", country: "Argentina" },
  { name: "Charly García", category: "Artist", country: "Argentina" },
  { name: "Fito Páez", category: "Artist", country: "Argentina" },
  { name: "Caifanes", category: "Band", country: "Mexico" },
  { name: "Café Tacvba", category: "Band", country: "Mexico" },
  { name: "Molotov", category: "Band", country: "Mexico" },
  { name: "Los Fabulosos Cadillacs", category: "Band", country: "Argentina" },
  { name: "Enanitos Verdes", category: "Band", country: "Argentina" },
  { name: "Babasónicos", category: "Band", country: "Argentina" },

  // Legendary Archival & Tapers Favorites
  { name: "Grateful Dead", category: "Band", country: "United States" },
  { name: "Phish", category: "Band", country: "United States" },
  { name: "The Smashing Pumpkins", category: "Band", country: "United States" },
  { name: "Billy Strings", category: "Artist", country: "United States" },
  { name: "King Gizzard & The Lizard Wizard", category: "Band", country: "Australia" },
  { name: "Widespread Panic", category: "Band", country: "United States" },
  { name: "The String Cheese Incident", category: "Band", country: "United States" },
  { name: "Umphrey's McGee", category: "Band", country: "United States" },
  { name: "Goose", category: "Band", country: "United States" },
  { name: "Jack Johnson", category: "Artist", country: "United States" },
  { name: "Ryan Adams", category: "Artist", country: "United States" },
  { name: "My Morning Jacket", category: "Band", country: "United States" },
  { name: "Ween", category: "Band", country: "United States" },
  { name: "Fugazi", category: "Band", country: "United States" },
  { name: "Elliott Smith", category: "Artist", country: "United States" },
  { name: "Jeff Buckley", category: "Artist", country: "United States" },
  { name: "Nick Drake", category: "Artist", country: "United Kingdom" },

  // Indie, Alt & Post-Punk
  { name: "Black Country, New Road", category: "Band", country: "United Kingdom" },
  { name: "Fontaines D.C.", category: "Band", country: "Ireland" },
  { name: "Radiohead", category: "Band", country: "United Kingdom" },
  { name: "The Strokes", category: "Band", country: "United States" },
  { name: "Arctic Monkeys", category: "Band", country: "United Kingdom" },
  { name: "The Cure", category: "Band", country: "United Kingdom" },
  { name: "Joy Division", category: "Band", country: "United Kingdom" },
  { name: "New Order", category: "Band", country: "United Kingdom" },
  { name: "The Smiths", category: "Band", country: "United Kingdom" },
  { name: "Morrissey", category: "Artist", country: "United Kingdom" },
  { name: "Depeche Mode", category: "Band", country: "United Kingdom" },
  { name: "Talking Heads", category: "Band", country: "United States" },
  { name: "David Bowie", category: "Artist", country: "United Kingdom" },
  { name: "Pixies", category: "Band", country: "United States" },
  { name: "Sonic Youth", category: "Band", country: "United States" },
  { name: "Pavement", category: "Band", country: "United States" },
  { name: "Dinosaur Jr.", category: "Band", country: "United States" },
  { name: "Slowdive", category: "Band", country: "United Kingdom" },
  { name: "My Bloody Valentine", category: "Band", country: "Ireland" },
  { name: "Cocteau Twins", category: "Band", country: "United Kingdom" },
  { name: "Beach House", category: "Band", country: "United States" },
  { name: "Alvvays", category: "Band", country: "Canada" },
  { name: "Men I Trust", category: "Band", country: "Canada" },
  { name: "Unknown Mortal Orchestra", category: "Band", country: "New Zealand" },
  { name: "Khruangbin", category: "Band", country: "United States" },
  { name: "Big Thief", category: "Band", country: "United States" },
  { name: "Phoebe Bridgers", category: "Artist", country: "United States" },
  { name: "Boygenius", category: "Band", country: "United States" },
  { name: "Mitski", category: "Artist", country: "United States" },
  { name: "Japanese Breakfast", category: "Band", country: "United States" },
  { name: "Bon Iver", category: "Band", country: "United States" },
  { name: "Fleet Foxes", category: "Band", country: "United States" },
  { name: "Sufjan Stevens", category: "Artist", country: "United States" },
  { name: "Father John Misty", category: "Artist", country: "United States" },
  { name: "Neutral Milk Hotel", category: "Band", country: "United States" },
  { name: "Built to Spill", category: "Band", country: "United States" },
  { name: "Modest Mouse", category: "Band", country: "United States" },
  { name: "Wilco", category: "Band", country: "United States" },
  { name: "The National", category: "Band", country: "United States" },
  { name: "LCD Soundsystem", category: "Band", country: "United States" },
  { name: "Arcade Fire", category: "Band", country: "Canada" },
  { name: "Vampire Weekend", category: "Band", country: "United States" },
  { name: "Phoenix", category: "Band", country: "France" },
  { name: "The White Stripes", category: "Band", country: "United States" },
  { name: "Queens of the Stone Age", category: "Band", country: "United States" },
  { name: "Nirvana", category: "Band", country: "United States" },
  { name: "Pearl Jam", category: "Band", country: "United States" },
  { name: "Soundgarden", category: "Band", country: "United States" },
  { name: "Alice In Chains", category: "Band", country: "United States" },
  { name: "Red Hot Chili Peppers", category: "Band", country: "United States" },
  { name: "Rage Against The Machine", category: "Band", country: "United States" },
  { name: "Foo Fighters", category: "Band", country: "United States" },
  { name: "Weezer", category: "Band", country: "United States" },
  { name: "Green Day", category: "Band", country: "United States" },
  { name: "Blink-182", category: "Band", country: "United States" },

  // Classic Rock & Psychedelia
  { name: "The Beatles", category: "Band", country: "United Kingdom" },
  { name: "Pink Floyd", category: "Band", country: "United Kingdom" },
  { name: "Led Zeppelin", category: "Band", country: "United Kingdom" },
  { name: "The Rolling Stones", category: "Band", country: "United Kingdom" },
  { name: "The Who", category: "Band", country: "United Kingdom" },
  { name: "The Doors", category: "Band", country: "United States" },
  { name: "Jimi Hendrix", category: "Artist", country: "United States" },
  { name: "Bob Dylan", category: "Artist", country: "United States" },
  { name: "Neil Young", category: "Artist", country: "Canada" },
  { name: "Fleetwood Mac", category: "Band", country: "United Kingdom" },
  { name: "Creedence Clearwater Revival", category: "Band", country: "United States" },
  { name: "The Velvet Underground", category: "Band", country: "United States" },
  { name: "Lou Reed", category: "Artist", country: "United States" },
  { name: "The Beach Boys", category: "Band", country: "United States" },
  { name: "Simon & Garfunkel", category: "Band", country: "United States" },
  { name: "Joni Mitchell", category: "Artist", country: "Canada" },
  { name: "Leonard Cohen", category: "Artist", country: "Canada" },
  { name: "The Band", category: "Band", country: "Canada" },
  { name: "The Allman Brothers Band", category: "Band", country: "United States" },
  { name: "Santana", category: "Band", country: "United States" },
  { name: "Steely Dan", category: "Band", country: "United States" },
  { name: "Frank Zappa", category: "Artist", country: "United States" },
  { name: "King Crimson", category: "Band", country: "United Kingdom" },
  { name: "Yes", category: "Band", country: "United Kingdom" },
  { name: "Genesis", category: "Band", country: "United Kingdom" },
  { name: "Rush", category: "Band", country: "Canada" },
  { name: "Black Sabbath", category: "Band", country: "United Kingdom" },
  { name: "Iron Maiden", category: "Band", country: "United Kingdom" },
  { name: "Metallica", category: "Band", country: "United States" },
  { name: "AC/DC", category: "Band", country: "Australia" },
  { name: "Queen", category: "Band", country: "United Kingdom" },

  // Hip Hop & R&B
  { name: "Kendrick Lamar", category: "Artist", country: "United States" },
  { name: "MF DOOM", category: "Artist", country: "United Kingdom" },
  { name: "Tyler, The Creator", category: "Artist", country: "United States" },
  { name: "Frank Ocean", category: "Artist", country: "United States" },
  { name: "Kanye West", category: "Artist", country: "United States" },
  { name: "A Tribe Called Quest", category: "Band", country: "United States" },
  { name: "Wu-Tang Clan", category: "Band", country: "United States" },
  { name: "Outkast", category: "Band", country: "United States" },
  { name: "Nas", category: "Artist", country: "United States" },
  { name: "The Notorious B.I.G.", category: "Artist", country: "United States" },
  { name: "2Pac", category: "Artist", country: "United States" },
  { name: "Jay-Z", category: "Artist", country: "United States" },
  { name: "Eminem", category: "Artist", country: "United States" },
  { name: "J. Cole", category: "Artist", country: "United States" },
  { name: "Travis Scott", category: "Artist", country: "United States" },
  { name: "Drake", category: "Artist", country: "Canada" },
  { name: "Earl Sweatshirt", category: "Artist", country: "United States" },
  { name: "Denzel Curry", category: "Artist", country: "United States" },
  { name: "JID", category: "Artist", country: "United States" },
  { name: "JPEGMAFIA", category: "Artist", country: "United States" },
  { name: "Death Grips", category: "Band", country: "United States" },
  { name: "Run The Jewels", category: "Band", country: "United States" },
  { name: "De La Soul", category: "Band", country: "United States" },
  { name: "Lauryn Hill", category: "Artist", country: "United States" },
  { name: "Erykah Badu", category: "Artist", country: "United States" },
  { name: "D'Angelo", category: "Artist", country: "United States" },
  { name: "Anderson .Paak", category: "Artist", country: "United States" },
  { name: "Thundercat", category: "Artist", country: "United States" },
  { name: "Flying Lotus", category: "Artist", country: "United States" },

  // Jazz, Soul, Blues & Legends
  { name: "Miles Davis", category: "Artist", country: "United States" },
  { name: "John Coltrane", category: "Artist", country: "United States" },
  { name: "Thelonious Monk", category: "Artist", country: "United States" },
  { name: "Bill Evans", category: "Artist", country: "United States" },
  { name: "Charles Mingus", category: "Artist", country: "United States" },
  { name: "Herbie Hancock", category: "Artist", country: "United States" },
  { name: "Chet Baker", category: "Artist", country: "United States" },
  { name: "Dave Brubeck", category: "Artist", country: "United States" },
  { name: "Sun Ra", category: "Artist", country: "United States" },
  { name: "Pharoah Sanders", category: "Artist", country: "United States" },
  { name: "Stevie Wonder", category: "Artist", country: "United States" },
  { name: "Marvin Gaye", category: "Artist", country: "United States" },
  { name: "Prince", category: "Artist", country: "United States" },
  { name: "Michael Jackson", category: "Artist", country: "United States" },
  { name: "Aretha Franklin", category: "Artist", country: "United States" },
  { name: "Otis Redding", category: "Artist", country: "United States" },
  { name: "Sam Cooke", category: "Artist", country: "United States" },
  { name: "Bill Withers", category: "Artist", country: "United States" },
  { name: "Curtis Mayfield", category: "Artist", country: "United States" },
  { name: "Al Green", category: "Artist", country: "United States" },
  { name: "Nina Simone", category: "Artist", country: "United States" },
  { name: "Billie Holiday", category: "Artist", country: "United States" },
  { name: "Ella Fitzgerald", category: "Artist", country: "United States" },
  { name: "B.B. King", category: "Artist", country: "United States" },
  { name: "Muddy Waters", category: "Artist", country: "United States" },
  { name: "Howlin' Wolf", category: "Artist", country: "United States" },
  { name: "Robert Johnson", category: "Artist", country: "United States" },
  { name: "Stevie Ray Vaughan", category: "Artist", country: "United States" },

  // Electronic & Ambient
  { name: "Daft Punk", category: "Band", country: "France" },
  { name: "Aphex Twin", category: "Artist", country: "United Kingdom" },
  { name: "Boards of Canada", category: "Band", country: "United Kingdom" },
  { name: "Burial", category: "Artist", country: "United Kingdom" },
  { name: "Massive Attack", category: "Band", country: "United Kingdom" },
  { name: "Portishead", category: "Band", country: "United Kingdom" },
  { name: "Björk", category: "Artist", country: "Iceland" },
  { name: "Kraftwerk", category: "Band", country: "Germany" },
  { name: "Brian Eno", category: "Artist", country: "United Kingdom" },
  { name: "Four Tet", category: "Artist", country: "United Kingdom" },
  { name: "Gorillaz", category: "Band", country: "United Kingdom" },

  // Popular Genres
  { name: "Psychedelic Rock", category: "Genre" },
  { name: "Post-Punk", category: "Genre" },
  { name: "Shoegaze", category: "Genre" },
  { name: "Dream Pop", category: "Genre" },
  { name: "Indie Rock", category: "Genre" },
  { name: "Bebop", category: "Genre" },
  { name: "Modal Jazz", category: "Genre" },
  { name: "Delta Blues", category: "Genre" },
  { name: "Krautrock", category: "Genre" },
  { name: "Live Soundboard Tapes", category: "Genre" },
  { name: "78 RPM Vintage Records", category: "Genre" },
  { name: "Netlabel Ambient", category: "Genre" },
];

/**
 * Searches local popular items matching query prefix and substring
 */
export function getLocalAutocompleteSuggestions(
  query: string,
  limit = 6
): AutocompleteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Exact / prefix matches first
  const prefixMatches: AutocompleteItem[] = [];
  const substringMatches: AutocompleteItem[] = [];

  for (const item of POPULAR_SUGGESTIONS) {
    const nameLower = item.name.toLowerCase();
    const hintLower = item.hint?.toLowerCase();

    if (nameLower.startsWith(q) || (hintLower && hintLower.startsWith(q))) {
      prefixMatches.push(item);
    } else if (nameLower.includes(q) || (hintLower && hintLower.includes(q))) {
      substringMatches.push(item);
    }
  }

  // Combine prefix matches first, then substring matches
  const combined = [...prefixMatches, ...substringMatches];
  return combined.slice(0, limit);
}

/**
 * Fuzzy "did you mean" suggestion: closest popular name within ~30% edit distance.
 */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

export function suggestCorrection(query: string): string | null {
  const clean = query.trim().toLowerCase();
  if (clean.length < 3) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const item of POPULAR_SUGGESTIONS) {
    const name = item.name.toLowerCase();
    if (name === clean || name.includes(clean) || clean.includes(name)) return null;
    const d = levenshtein(clean, name);
    if (d <= Math.max(1, Math.floor(name.length * 0.3)) && d < bestD) {
      bestD = d;
      best = item.name;
    }
  }
  return best;
}

/**
 * Checks if a search query strongly matches a known artist or band name
 */
export function findMatchingArtistName(query: string): string | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // Exact match first
  const exact = POPULAR_SUGGESTIONS.find(
    (item) =>
      (item.category === "Artist" || item.category === "Band") &&
      (item.name.toLowerCase() === clean || (item.hint && item.hint.toLowerCase() === clean))
  );
  if (exact) return exact.name;

  // Prefix match (if query is at least 3 chars)
  if (clean.length >= 3) {
    const prefix = POPULAR_SUGGESTIONS.find(
      (item) =>
        (item.category === "Artist" || item.category === "Band") &&
        item.name.toLowerCase().startsWith(clean)
    );
    if (prefix) return prefix.name;
  }

  return null;
}
