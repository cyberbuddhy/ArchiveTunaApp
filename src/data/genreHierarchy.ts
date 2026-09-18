export interface GenreNode {
  id: string;
  name: string;
  query: string;
  description?: string;
  subgenres?: GenreNode[];
}

export const GENRE_HIERARCHY: GenreNode[] = [
  {
    id: "rock",
    name: "Rock",
    query: "rock",
    description: "Driving guitars, energetic rhythms, and passionate songwriting spanning seven decades",
    subgenres: [
      {
        id: "psychedelic-rock",
        name: "Psychedelic Rock",
        query: "psychedelic rock",
        description: "Mind-expanding soundscapes, fuzz guitar, modal melodies, and improvisation",
        subgenres: [
          {
            id: "neo-psychedelia",
            name: "Neo-Psychedelia",
            query: "neo psychedelia",
            description: "Modern resurgence of psychedelic sounds, kaleidoscopic textures, and surreal pop",
          },
          {
            id: "acid-rock",
            name: "Acid Rock",
            query: "acid rock",
            description: "Raw, heavy distorted blues jams born from the late 1960s counterculture",
          },
          {
            id: "space-rock",
            name: "Space Rock",
            query: "space rock",
            description: "Hypnotic, cosmic synthesizer textures, echo-laden guitars, and celestial themes",
          },
          {
            id: "krautrock",
            name: "Krautrock",
            query: "krautrock",
            description: "Motorik hypnotic rhythms, tape experiments, and German experimental rock",
          },
          {
            id: "paisley-underground",
            name: "Paisley Underground",
            query: "paisley underground",
            description: "1980s Californian revival blending 60s jangle psych with punk attitude",
          },
          {
            id: "psych-folk",
            name: "Psych Folk",
            query: "psych folk",
            description: "Acoustic instruments woven with ethereal reverb, drone, and mystic lyrics",
          },
        ],
      },
      {
        id: "progressive-rock",
        name: "Progressive Rock",
        query: "progressive rock",
        description: "Complex time signatures, concept themes, virtuoso musicianship, and symphonic scale",
        subgenres: [
          {
            id: "symphonic-prog",
            name: "Symphonic Prog",
            query: "symphonic prog",
            description: "Classical composition structures, Mellotrons, and epic multi-part suites",
          },
          {
            id: "canterbury-scene",
            name: "Canterbury Scene",
            query: "canterbury scene",
            description: "Whimsical, jazz-infused English progressive rock with fuzzy organ tones",
          },
          {
            id: "art-rock",
            name: "Art Rock",
            query: "art rock",
            description: "Theatrical, experimental, and avant-garde approaches to rock music",
          },
          {
            id: "math-rock",
            name: "Math Rock",
            query: "math rock",
            description: "Angular riffs, stop-start dynamics, and irregular metric patterns",
          },
          {
            id: "post-rock",
            name: "Post-Rock",
            query: "post rock",
            description: "Using rock instrumentation for texture, timbre, and crescendo rather than verse-chorus formulas",
          },
        ],
      },
      {
        id: "punk-rock",
        name: "Punk Rock",
        query: "punk rock",
        description: "Raw energy, DIY ethos, stripped-back instrumentation, and anti-establishment lyrics",
        subgenres: [
          {
            id: "post-punk",
            name: "Post-Punk",
            query: "post punk",
            description: "Dark, moody basslines, gothic atmospherics, and angular synthesizers",
          },
          {
            id: "hardcore-punk",
            name: "Hardcore Punk",
            query: "hardcore punk",
            description: "Hyper-fast tempos, shouted vocals, and furious DIY underground community",
          },
          {
            id: "garage-punk",
            name: "Garage Punk",
            query: "garage punk",
            description: "Lo-fi fuzz, gritty organ riffs, and frenetic 60s/70s garage drive",
          },
          {
            id: "no-wave",
            name: "No Wave",
            query: "no wave",
            description: "Dissonant, abrasive, anti-melodic New York art-punk experiments",
          },
          {
            id: "riot-grrrl",
            name: "Riot Grrrl",
            query: "riot grrrl",
            description: "Third-wave feminist punk movement from the Pacific Northwest",
          },
        ],
      },
      {
        id: "indie-alternative",
        name: "Indie & Alternative",
        query: "alternative rock",
        description: "Independent label spirit, unconventional chord progressions, and college radio roots",
        subgenres: [
          {
            id: "shoegaze",
            name: "Shoegaze",
            query: "shoegaze",
            description: "Walls of swirling guitar reverb, feedback effects, and buried melodic vocals",
          },
          {
            id: "dream-pop",
            name: "Dream Pop",
            query: "dream pop",
            description: "Lush reverbs, shimmering guitars, and soft, atmospheric vocal textures",
          },
          {
            id: "grunge",
            name: "Grunge",
            query: "grunge",
            description: "Heavy distorted sludge guitars, dynamic quiet-loud contrasts, and angst-ridden lyrics",
          },
          {
            id: "lo-fi-indie",
            name: "Lo-Fi Indie",
            query: "lo fi indie",
            description: "Cassette tape hiss, unpolished home recordings, and intimate raw songwriting",
          },
          {
            id: "midwest-emo",
            name: "Midwest Emo",
            query: "midwest emo",
            description: "Twinkling guitar arpeggios, dynamic math-rock shifts, and cathartic emotional vocals",
          },
        ],
      },
      {
        id: "hard-classic-rock",
        name: "Classic & Hard Rock",
        query: "classic rock",
        description: "Blues-based riffs, power chords, soaring solos, and legendary arena anthems",
        subgenres: [
          {
            id: "blues-rock",
            name: "Blues Rock",
            query: "blues rock",
            description: "Electrified 12-bar blues foundations with roaring tube amplifiers",
          },
          {
            id: "glam-rock",
            name: "Glam Rock",
            query: "glam rock",
            description: "Catchy theatrical stompers, glitter hooks, and flamboyant showmanship",
          },
          {
            id: "southern-rock",
            name: "Southern Rock",
            query: "southern rock",
            description: "Dual harmony lead guitars, country twang, and jam-band boogie",
          },
          {
            id: "stoner-rock",
            name: "Stoner Rock",
            query: "stoner rock",
            description: "Down-tuned fuzzy riffs, heavy Sabbath grooves, and hypnotic desert jams",
          },
        ],
      },
    ],
  },
  {
    id: "pop",
    name: "Pop",
    query: "pop music",
    description: "Catchy hooks, memorable melodies, vibrant arrangements, and chart-defining anthems",
    subgenres: [
      {
        id: "synthpop-electropop",
        name: "Synth-Pop & Electro-Pop",
        query: "synth pop",
        description: "Synthesizer-dominated hooks, electronic percussion, and 80s new wave aesthetics",
        subgenres: [
          {
            id: "synthwave",
            name: "Synthwave / Retrowave",
            query: "synthwave",
            description: "Nostalgic 1980s film soundtrack synths, gated reverb snares, and neon aesthetics",
          },
          {
            id: "hyperpop",
            name: "Hyperpop",
            query: "hyperpop",
            description: "Maximalist, exaggerated pop tropes, pitched vocals, and distorted micro-synths",
          },
          {
            id: "chillwave",
            name: "Chillwave",
            query: "chillwave",
            description: "Sun-bleached vintage analog synthesizers, tape warble, and faded summer vocals",
          },
          {
            id: "futurepop",
            name: "Futurepop",
            query: "futurepop",
            description: "Electronic body music grooves blended with uplifting trance synth melodies",
          },
        ],
      },
      {
        id: "indie-pop",
        name: "Indie Pop & Chamber Pop",
        query: "indie pop",
        description: "Gentle DIY melodic guitar hooks, orchestral strings, and heartfelt lyricism",
        subgenres: [
          {
            id: "jangle-pop",
            name: "Jangle Pop",
            query: "jangle pop",
            description: "Bright, chiming 12-string Rickenbacker guitars and ringing major chords",
          },
          {
            id: "baroque-pop",
            name: "Baroque Pop",
            query: "baroque pop",
            description: "Classical strings, harpsichords, oboes, and sophisticated 1960s pop arrangements",
          },
          {
            id: "twee-pop",
            name: "Twee Pop",
            query: "twee pop",
            description: "Innocent, whimsical melodies, glockenspiels, acoustic guitars, and boy-girl harmonies",
          },
          {
            id: "noise-pop",
            name: "Noise Pop",
            query: "noise pop",
            description: "Irresistible pop song structures buried underneath harsh guitar feedback and distortion",
          },
        ],
      },
      {
        id: "art-pop",
        name: "Art Pop & Experimental",
        query: "art pop",
        description: "Unconventional song structures, avant-garde textures, and conceptual visual art",
        subgenres: [
          {
            id: "sophisti-pop",
            name: "Sophisti-Pop",
            query: "sophisti pop",
            description: "Polished jazz, soul, and pop crossover with lush electric piano and fretless bass",
          },
          {
            id: "hypnagogic-pop",
            name: "Hypnagogic Pop",
            query: "hypnagogic pop",
            description: "Lo-fi cassette nostalgia evoking childhood memories of radio broadcast music",
          },
          {
            id: "dark-pop",
            name: "Dark Pop",
            query: "dark pop",
            description: "Brooding minor-key electronics, gothic imagery, and cinematic sub-bass",
          },
        ],
      },
      {
        id: "city-pop-global",
        name: "City Pop & International",
        query: "city pop",
        description: "Breezy urban jazz-fusion, disco basslines, and international pop sensations",
        subgenres: [
          {
            id: "japanese-city-pop",
            name: "Japanese City Pop",
            query: "japanese city pop",
            description: "1970s and 80s Tokyo cosmopolitan jazz, funk, and soft-rock luxury pop",
          },
          {
            id: "french-chanson-pop",
            name: "French Pop & Chanson",
            query: "french pop chanson",
            description: "Lyrical poetic storytelling, accordion touches, and vintage ye-ye melodies",
          },
          {
            id: "europop",
            name: "Europop & Eurodance",
            query: "eurodance europop",
            description: "Four-on-the-floor kick drums, dramatic synth stabs, and infectious vocal choruses",
          },
        ],
      },
    ],
  },
  {
    id: "electronic",
    name: "Electronic",
    query: "electronic",
    description: "Synthesizers, sequencers, drum machines, and futuristic sonic exploration",
    subgenres: [
      {
        id: "ambient",
        name: "Ambient",
        query: "ambient",
        description: "Atmospheric texture over traditional beat structures, evoking vast soundscapes",
        subgenres: [
          {
            id: "drone",
            name: "Drone Ambient",
            query: "drone ambient",
            description: "Sustained tones, harmonic resonance, and meditative acoustic/synth swells",
          },
          {
            id: "dark-ambient",
            name: "Dark Ambient",
            query: "dark ambient",
            description: "Foreboding, ominous cavernous reverberations, industrial drones, and shadow soundscapes",
          },
          {
            id: "space-ambient",
            name: "Space Ambient",
            query: "space ambient",
            description: "Cosmic synthesizer voyages inspired by planetary discovery and deep astronomy",
          },
          {
            id: "ambient-techno",
            name: "Ambient Techno",
            query: "ambient techno",
            description: "Gentle 4/4 pulses layered underneath floating, melodic synth atmospheres",
          },
        ],
      },
      {
        id: "idm-glitch",
        name: "IDM & Glitch",
        query: "idm electronic",
        description: "Intelligent dance music, complex breakbeat chopping, and micro-editing",
        subgenres: [
          {
            id: "braindance",
            name: "Braindance",
            query: "braindance",
            description: "Wild polyrhythmic acid synthesizers, hyper-detailed percussion, and emotional melody",
          },
          {
            id: "glitch",
            name: "Glitch & Microhouse",
            query: "glitch electronic",
            description: "Digital malfunction aesthetics, vinyl clicks, digital errors turned into rhythm",
          },
          {
            id: "drill-n-bass",
            name: "Drill 'n' Bass",
            query: "drill n bass",
            description: "Extremely rapid breakbeats chopped at impossible speeds over warm Rhodes pads",
          },
        ],
      },
      {
        id: "house",
        name: "House",
        query: "house music",
        description: "Soulful 4-on-the-floor kick drums, uplifting chords, and Chicago dance roots",
        subgenres: [
          {
            id: "deep-house",
            name: "Deep House",
            query: "deep house",
            description: "Warm chords, subtle bass grooves, jazzy chords, and introspective nighttime vibe",
          },
          {
            id: "acid-house",
            name: "Acid House",
            query: "acid house",
            description: "Squelchy, resonant TB-303 synthesizer basslines that fueled the summer of love",
          },
          {
            id: "tech-house",
            name: "Tech House",
            query: "tech house",
            description: "Stripped-back techno percussion paired with groovy house basslines",
          },
        ],
      },
      {
        id: "techno",
        name: "Techno",
        query: "techno",
        description: "Hypnotic repetition, machine soul, and Detroit industrial futurism",
        subgenres: [
          {
            id: "dub-techno",
            name: "Dub Techno",
            query: "dub techno",
            description: "Tape echo delays, submerged reverbs, tape hiss, and oceanic chords",
          },
          {
            id: "minimal-techno",
            name: "Minimal Techno",
            query: "minimal techno",
            description: "Stripped to essential skeletal pulses, micro-textures, and subtle evolution",
          },
          {
            id: "detroit-techno",
            name: "Detroit Techno",
            query: "detroit techno",
            description: "Soulful science-fiction strings, Roland TR-909 beats, and pioneering synth vision",
          },
        ],
      },
      {
        id: "downtempo-triphop",
        name: "Downtempo & Trip Hop",
        query: "downtempo",
        description: "Languid hip hop beats, vinyl crackle, atmospheric strings, and cinematic chillout",
        subgenres: [
          {
            id: "trip-hop",
            name: "Trip Hop",
            query: "trip hop",
            description: "Moody Bristol sound blending slow hip-hop breakbeats with dark jazz and soul",
          },
          {
            id: "vaporwave",
            name: "Vaporwave",
            query: "vaporwave",
            description: "Slowed-down corporate muzak, 80s smooth jazz samples, and surreal nostalgia",
          },
          {
            id: "chillhop",
            name: "Lo-Fi Beats / Chillhop",
            query: "chillhop lo fi",
            description: "Dusty boom-bap drum loops, nostalgic electric piano keys, and relaxing study beats",
          },
        ],
      },
      {
        id: "dnb-jungle",
        name: "Drum & Bass / Jungle",
        query: "drum and bass jungle",
        description: "High-tempo syncopated Amen breaks, deep 808 sub-bass, and UK rave energy",
        subgenres: [
          {
            id: "liquid-funk",
            name: "Liquid Funk D&B",
            query: "liquid funk dnb",
            description: "Soulful vocals, disco strings, and warm electric Rhodes over fast rolling breaks",
          },
          {
            id: "ragga-jungle",
            name: "Ragga Jungle",
            query: "ragga jungle",
            description: "Reggae and dancehall vocal toasting layered over frenetic, pitched-up breakbeats",
          },
        ],
      },
    ],
  },
  {
    id: "hip-hop",
    name: "Hip Hop",
    query: "hip hop",
    description: "Boom bap rhythms, turntablism, poetic lyricism, sampling culture, and urban narrative",
    subgenres: [
      {
        id: "golden-age",
        name: "Boom Bap & Classic",
        query: "boom bap hip hop",
        description: "Hard-hitting SP-1200 / MPC kicks, dusty vinyl loops, and intricate lyricism",
        subgenres: [
          {
            id: "jazz-rap",
            name: "Jazz Rap",
            query: "jazz rap hip hop",
            description: "Horn samples, upright basslines, conscious lyrics, and laid-back groove",
          },
          {
            id: "conscious-hiphop",
            name: "Conscious & Underground",
            query: "conscious hip hop underground",
            description: "Social commentary, poetic storytelling, and uncompromising independence",
          },
        ],
      },
      {
        id: "instrumental-lofi-hiphop",
        name: "Instrumental Beats",
        query: "instrumental hip hop beats",
        description: "Producer beat tapes, chops, vinyl crackle, and head-nodding groove",
        subgenres: [
          {
            id: "abstract-hiphop",
            name: "Abstract / Glitch Hop",
            query: "abstract hip hop",
            description: "Deconstructed beats, fractured samples, and experimental rhythm collage",
          },
        ],
      },
      {
        id: "southern-trap",
        name: "Southern & Trap",
        query: "trap southern hip hop",
        description: "Rolling 808 sub-bass, rapid hi-hat triplets, and hypnotic brass hits",
        subgenres: [
          {
            id: "chopped-and-screwed",
            name: "Chopped and Screwed",
            query: "chopped and screwed",
            description: "DJ Screw Houston style: heavily slowed vinyl pitches, skips, and echoed repetitions",
          },
          {
            id: "dirty-south",
            name: "Dirty South & Bounce",
            query: "dirty south bounce",
            description: "High-energy polyrhythmic clap patterns and brass fanfares from Atlanta and New Orleans",
          },
        ],
      },
    ],
  },
  {
    id: "jazz",
    name: "Jazz",
    query: "jazz",
    description: "Swing, complex harmony, call-and-response, and masterful improvisation",
    subgenres: [
      {
        id: "bebop-modal",
        name: "Bebop & Modal Jazz",
        query: "bebop jazz",
        description: "Fast tempos, asymmetric phrasing, and modal chord explorations",
        subgenres: [
          {
            id: "hard-bop",
            name: "Hard Bop",
            query: "hard bop",
            description: "Soul, gospel, and blues-infused extensions of 1950s bebop",
          },
          {
            id: "cool-jazz",
            name: "Cool Jazz",
            query: "cool jazz",
            description: "Restrained vibrato, relaxed tempos, and understated West Coast arrangements",
          },
          {
            id: "modal-jazz",
            name: "Modal Jazz",
            query: "modal jazz",
            description: "Improvisation centered on modes and scales rather than rapid chord changes",
          },
        ],
      },
      {
        id: "fusion-jazzrock",
        name: "Jazz Fusion",
        query: "jazz fusion",
        description: "Electric guitars, synthesizer solos, rock drumming, and jazz harmonic freedom",
        subgenres: [
          {
            id: "jazz-funk",
            name: "Jazz Funk",
            query: "jazz funk",
            description: "Slap bass, clavinet grooves, horn punches, and danceable syncopation",
          },
          {
            id: "smooth-jazz",
            name: "Smooth Jazz",
            query: "smooth jazz",
            description: "Polished radio-friendly melodies, lyrical soprano saxophone, and warm pop backing",
          },
        ],
      },
      {
        id: "avant-garde-jazz",
        name: "Free Jazz & Spiritual",
        query: "free jazz",
        description: "Breaking formal bar structures, microtonal saxophone, and deep spiritual communion",
        subgenres: [
          {
            id: "spiritual-jazz",
            name: "Spiritual Jazz",
            query: "spiritual jazz",
            description: "Eastern instruments, harp glissandos, meditative chants, and cosmic consciousness",
          },
          {
            id: "free-improvisation",
            name: "Free Improvisation",
            query: "free improvisation jazz",
            description: "Total spontaneous acoustic composition with unrestricted harmonic rules",
          },
        ],
      },
      {
        id: "swing-bigband",
        name: "Swing & Big Band (78 RPM)",
        query: "swing big band 78rpm",
        description: "Orchestrated horn sections, walking upright bass, and dance hall swing",
        subgenres: [
          {
            id: "dixieland",
            name: "Dixieland & Traditional",
            query: "dixieland jazz",
            description: "Early New Orleans polyphony, trumpet leads, clarinet counterpoint, and trombone slides",
          },
          {
            id: "gypsy-jazz",
            name: "Gypsy Jazz",
            query: "gypsy jazz",
            description: "Acoustic Selmer guitars, virtuoso violin runs, and rhythmic 'la pompe' accompaniment",
          },
        ],
      },
    ],
  },
  {
    id: "classical",
    name: "Classical",
    query: "classical music",
    description: "Centuries of acoustic orchestral, chamber, and solo instrumental mastery",
    subgenres: [
      {
        id: "baroque",
        name: "Baroque & Early Music",
        query: "baroque classical",
        description: "Intricate counterpoint, basso continuo, harpsichords, and ornamental flourishes",
        subgenres: [
          {
            id: "sacred-choral",
            name: "Sacred Choral & Polyphony",
            query: "choral polyphony",
            description: "Renaissance masses, ethereal cathedral acoustics, and layered vocal motets",
          },
          {
            id: "harpsichord-organ",
            name: "Baroque Organ & Harpsichord",
            query: "baroque organ bach",
            description: "Monumental fugues, toccatas, and contrapuntal keyboard architecture",
          },
        ],
      },
      {
        id: "romantic",
        name: "Romantic Era",
        query: "romantic classical",
        description: "Intense emotional expression, dramatic dynamic range, and expanded orchestra",
        subgenres: [
          {
            id: "piano-nocturnes",
            name: "Piano Nocturnes & Preludes",
            query: "chopin nocturnes piano",
            description: "Intimate lyricism, rubato timing, and expressive solo grand piano poetry",
          },
          {
            id: "symphonic-poems",
            name: "Symphonic Poems",
            query: "symphonic poem orchestra",
            description: "Orchestral program music narrating literary, mythological, and pastoral epics",
          },
        ],
      },
      {
        id: "modern-minimalism",
        name: "20th Century & Minimalism",
        query: "minimalism classical contemporary",
        description: "Repetitive phasing patterns, avant-garde atonality, and sonic exploration",
        subgenres: [
          {
            id: "minimalist-classical",
            name: "Minimalism",
            query: "minimalist classical",
            description: "Hypnotic repeating cellular motifs, gradual phase shifts, and tonal purity",
          },
          {
            id: "contemporary-classical",
            name: "Avant-Garde & Chamber",
            query: "contemporary classical chamber",
            description: "Extended instrument techniques, prepared piano, and microtonal composition",
          },
        ],
      },
    ],
  },
  {
    id: "latin",
    name: "Latin",
    query: "latin music",
    description: "Infectious syncopated percussion, passionate brass, acoustic guitars, and dance heritage",
    subgenres: [
      {
        id: "tropical-salsa",
        name: "Salsa & Afro-Cuban",
        query: "salsa afro cuban",
        description: "Clave rhythms, piano montunos, driving congas, and explosive brass sections",
        subgenres: [
          {
            id: "son-cubano",
            name: "Son Cubano",
            query: "son cubano",
            description: "Traditional Cuban folk roots blending Spanish guitar with African percussion",
          },
          {
            id: "mambo-chachacha",
            name: "Mambo & Cha-Cha-Chá",
            query: "mambo cha cha cha",
            description: "Classic 1950s ballroom Cuban rhythms popularized in Havana and New York",
          },
          {
            id: "bolero",
            name: "Bolero Latino",
            query: "bolero latin",
            description: "Romantic slow-tempo ballads characterized by poetic lyrics and acoustic requinto guitar",
          },
        ],
      },
      {
        id: "brazilian",
        name: "Brazilian & Bossa Nova",
        query: "bossa nova brazilian",
        description: "Sophisticated jazz harmonies, nylon-string guitar picking, and swaying rhythms",
        subgenres: [
          {
            id: "bossa-nova",
            name: "Bossa Nova",
            query: "bossa nova",
            description: "Understated vocal delivery, poetic Portuguese lyrics, and syncopated thumb bass",
          },
          {
            id: "samba",
            name: "Samba",
            query: "samba brasil",
            description: "Joyful Carnaval rhythms driven by pandeiros, cuícas, surdos, and cavaquinhos",
          },
          {
            id: "forro",
            name: "Forró",
            query: "forro brasil",
            description: "Northeastern Brazilian folk dance music led by accordion, zabumba, and triangle",
          },
        ],
      },
      {
        id: "cumbia-tropical",
        name: "Cumbia & Folkloric",
        query: "cumbia",
        description: "Hypnotic 2/4 rhythm originating in Colombia, widespread throughout Latin America",
        subgenres: [
          {
            id: "cumbia-psicodelica",
            name: "Chicha / Cumbia Psicodélica",
            query: "chicha cumbia psicodelica",
            description: "Peruvian blend of Amazonian cumbia with surf rock and psychedelic fuzz guitars",
          },
          {
            id: "cumbia-villera",
            name: "Cumbia Sonidera & Villera",
            query: "cumbia sonidera",
            description: "Synthesizer-heavy urban cumbia with pitch-shifted voices and deep bass",
          },
        ],
      },
      {
        id: "regional-mexican",
        name: "Regional Mexican",
        query: "regional mexican",
        description: "Vibrant horns, accordions, story-telling corridos, and acoustic rancheras",
        subgenres: [
          {
            id: "mariachi",
            name: "Mariachi & Ranchera",
            query: "mariachi ranchera",
            description: "Violins, trumpets, vihuelas, and deep guitarróns celebrating Mexican folklore",
          },
          {
            id: "norteno-banda",
            name: "Norteño & Banda",
            query: "norteno banda",
            description: "Button accordion, bajo sexto, and massive brass tubas driving lively polkas and waltzes",
          },
        ],
      },
      {
        id: "flamenco",
        name: "Flamenco & Iberian",
        query: "flamenco spanish",
        description: "Intense rhythmic palmas, percussive guitar rasgueados, and passionate cante jondo",
        subgenres: [
          {
            id: "flamenco-puro",
            name: "Flamenco Guitar Solo",
            query: "flamenco guitar solo",
            description: "Virtuoso nylon guitar expressions following traditional palos (Soleá, Bulerías)",
          },
          {
            id: "fado",
            name: "Portuguese Fado",
            query: "portuguese fado",
            description: "Melancholic Portuguese guitar ballads steeped in the poetic feeling of Saudade",
          },
        ],
      },
    ],
  },
  {
    id: "rnb-soul",
    name: "R&B & Soul",
    query: "soul music rnb",
    description: "Deep emotional vocal delivery, infectious gospel roots, and irresistible groove",
    subgenres: [
      {
        id: "classic-soul",
        name: "Classic Soul & Motown",
        query: "motown soul music",
        description: "Punchy rhythm sections, horn fanfares, and impassioned vocal harmonies",
        subgenres: [
          {
            id: "northern-soul",
            name: "Northern Soul",
            query: "northern soul",
            description: "Fast-tempo mid-60s Motown beat singles that fueled underground dance clubs",
          },
          {
            id: "southern-soul",
            name: "Southern & Deep Soul",
            query: "southern soul stax",
            description: "Gritty, blues-drenched gospel passion produced in Memphis and Muscle Shoals",
          },
          {
            id: "philly-soul",
            name: "Philly Soul",
            query: "philly soul",
            description: "Lush string arrangements, sweeping horns, and smooth vocal harmonies",
          },
        ],
      },
      {
        id: "funk",
        name: "Funk",
        query: "funk",
        description: "Heavy emphasis on 'The One' downbeat, syncopated basslines, and brass stabs",
        subgenres: [
          {
            id: "p-funk",
            name: "P-Funk",
            query: "parliament funkadelic p funk",
            description: "Cosmic psychedelic funk, Moog basslines, and theatrical sci-fi concepts",
          },
          {
            id: "deep-funk",
            name: "Deep Funk",
            query: "deep funk rare groove",
            description: "Raw, gritty, heavy drum breaks and rare 45rpm vinyl instrumentals",
          },
        ],
      },
      {
        id: "neo-soul",
        name: "Neo-Soul & Alternative R&B",
        query: "neo soul",
        description: "Organic instrumentation, Fender Rhodes keys, hip-hop drum loops, and conscious poetry",
        subgenres: [
          {
            id: "quiet-storm",
            name: "Quiet Storm",
            query: "quiet storm rnb",
            description: "Soft, intimate late-night soul ballads featuring mellow synthesizers and saxophone",
          },
        ],
      },
    ],
  },
  {
    id: "country",
    name: "Country",
    query: "country music",
    description: "Acoustic guitars, fiddles, pedal steel twang, and heartfelt narratives of life",
    subgenres: [
      {
        id: "classic-country",
        name: "Honky Tonk & Classic",
        query: "honky tonk country",
        description: "Front-and-center pedal steel, shuffling snare beats, and poignant barroom laments",
        subgenres: [
          {
            id: "outlaw-country",
            name: "Outlaw Country",
            query: "outlaw country",
            description: "Rebellious counter-Nashville attitude blending country roots with rock grit",
          },
          {
            id: "bakersfield-sound",
            name: "Bakersfield Sound",
            query: "bakersfield country",
            description: "Twangy Fender Telecasters, driving backbeats, and stripped-down California energy",
          },
        ],
      },
      {
        id: "alt-country",
        name: "Alt-Country & Americana",
        query: "alt country americana",
        description: "Indie rock spirit married to acoustic roots, folk storytelling, and raw honesty",
        subgenres: [
          {
            id: "roots-rock",
            name: "Roots Rock",
            query: "roots rock americana",
            description: "Blues-infused earthy rock driven by Hammond organs and acoustic strumming",
          },
          {
            id: "dark-country",
            name: "Gothic Country / Dark Country",
            query: "gothic country dark",
            description: "Ominous banjo plucking, haunting murder ballads, and swampy acoustic grit",
          },
        ],
      },
      {
        id: "bluegrass",
        name: "Bluegrass & Old-Time",
        query: "bluegrass music",
        description: "Lightning-fast acoustic picking, five-string banjo, mandolin, and high-lonesome singing",
        subgenres: [
          {
            id: "traditional-bluegrass",
            name: "Traditional Bluegrass",
            query: "traditional bluegrass",
            description: "Acoustic strings gathered around a single condenser microphone",
          },
          {
            id: "progressive-bluegrass",
            name: "Progressive Bluegrass / Newgrass",
            query: "newgrass progressive bluegrass",
            description: "Jazz improvisation, rock rhythms, and extended jams played on bluegrass instruments",
          },
        ],
      },
    ],
  },
  {
    id: "reggae-ska",
    name: "Reggae & Ska",
    query: "reggae music",
    description: "Syncopated offbeat chops, conscious spiritual lyrics, deep bass, and Jamaican heritage",
    subgenres: [
      {
        id: "roots-reggae",
        name: "Roots Reggae",
        query: "roots reggae",
        description: "Rastafari spirituality, one-drop drum rhythms, and uplifting conscious messages",
        subgenres: [
          {
            id: "dub",
            name: "Dub",
            query: "dub reggae",
            description: "Studio mixing desk art: stripped drum-and-bass with swirling tape delays and reverbs",
          },
          {
            id: "lovers-rock",
            name: "Lovers Rock",
            query: "lovers rock reggae",
            description: "Romantic, smooth soul ballads delivered over relaxing reggae rhythm tracks",
          },
        ],
      },
      {
        id: "ska-rocksteady",
        name: "Ska & Rocksteady",
        query: "ska music rocksteady",
        description: "Walking basslines, upbeat horn fanfares, and 1960s Kingston dance rhythms",
        subgenres: [
          {
            id: "two-tone",
            name: "2 Tone & Ska Punk",
            query: "two tone ska",
            description: "Late 70s British revival blending Jamaican ska beats with punk rock tempo and edge",
          },
          {
            id: "rocksteady",
            name: "Rocksteady",
            query: "rocksteady jamaica",
            description: "Slower, relaxed predecessor to reggae emphasizing soulful vocal groups and electric bass",
          },
        ],
      },
    ],
  },
  {
    id: "blues",
    name: "Blues",
    query: "blues",
    description: "Raw soulful honesty, 12-bar progressions, bent notes, and timeless guitar poetry",
    subgenres: [
      {
        id: "delta-blues",
        name: "Delta & Country Blues",
        query: "delta blues",
        description: "Slide guitars, resonant Dobros, stomping boots, and piercing vocal cries",
        subgenres: [
          {
            id: "piedmont-blues",
            name: "Piedmont Blues",
            query: "piedmont blues",
            description: "Ragtime-influenced fingerpicking with syncopated thumb bass",
          },
          {
            id: "texas-blues",
            name: "Texas Blues",
            query: "texas blues",
            description: "Swinging shuffle rhythms, melodic single-string leads, and soulful vocals",
          },
        ],
      },
      {
        id: "electric-chicago-blues",
        name: "Chicago & Electric Blues",
        query: "chicago blues electric",
        description: "Overdriven harmonica through bullet mics, electric guitars, and urban drive",
        subgenres: [
          {
            id: "jump-blues",
            name: "Jump Blues",
            query: "jump blues",
            description: "Up-tempo horn-driven swing blues that directly birthed rock 'n' roll",
          },
        ],
      },
    ],
  },
  {
    id: "metal",
    name: "Metal",
    query: "heavy metal",
    description: "Distorted heavy riffs, pounding double-bass drums, power, and dark mythology",
    subgenres: [
      {
        id: "doom-stoner-metal",
        name: "Doom & Sludge",
        query: "doom metal",
        description: "Slow monolithic tempos, earth-shaking fuzz, despair, and crushing resonance",
        subgenres: [
          {
            id: "drone-metal",
            name: "Drone Metal",
            query: "drone metal",
            description: "Sustained guitar feedback vibrations and amplifier worship",
          },
          {
            id: "funeral-doom",
            name: "Funeral Doom",
            query: "funeral doom",
            description: "Glacial tempos, mournful synthesizers, and cavernous growled dirges",
          },
        ],
      },
      {
        id: "atmospheric-black-metal",
        name: "Atmospheric Black & Post-Metal",
        query: "atmospheric black metal",
        description: "Cascading tremolo picking, blast beats, nature mysticism, and shoegaze shimmer",
        subgenres: [
          {
            id: "blackgaze",
            name: "Blackgaze",
            query: "blackgaze post metal",
            description: "Shoegaze wall-of-sound textures blended with cathartic black metal shrieks",
          },
        ],
      },
      {
        id: "thrash-speed-metal",
        name: "Thrash & Speed Metal",
        query: "thrash speed metal",
        description: "Rapid palm-muted guitar chugging, blistering guitar solos, and aggressive vocals",
        subgenres: [
          {
            id: "death-metal",
            name: "Death Metal",
            query: "death metal",
            description: "Guttural vocals, blast beats, chromatic guitar riffs, and morbid themes",
          },
        ],
      },
    ],
  },
  {
    id: "folk-traditional",
    name: "Folk & Acoustic",
    query: "folk music",
    description: "Oral storytelling, acoustic guitars, banjos, fiddles, and community heritage",
    subgenres: [
      {
        id: "traditional-folk",
        name: "Traditional & Roots",
        query: "traditional folk",
        description: "Ballads passed through generations, field recordings, and regional songcraft",
        subgenres: [
          {
            id: "american-primitivism",
            name: "American Primitivism",
            query: "american primitivism guitar",
            description: "Fingerstyle acoustic steel-string guitar blending country blues with avant-garde ragtime",
          },
          {
            id: "celtic-folk",
            name: "Celtic Folk",
            query: "celtic folk",
            description: "Uilleann pipes, tin whistles, bodhráns, jigs, reels, and haunting airs",
          },
        ],
      },
      {
        id: "folk-rock",
        name: "Folk Rock & Anti-Folk",
        query: "folk rock",
        description: "Acoustic lyrics amplified with electric rhythm sections and vocal harmonies",
        subgenres: [
          {
            id: "indie-folk",
            name: "Indie Folk",
            query: "indie folk",
            description: "Contemporary acoustic balladry with chamber horns, stomps, and intimate lyrics",
          },
          {
            id: "anti-folk",
            name: "Anti-Folk",
            query: "anti folk",
            description: "Subversive, humorous, quirky, and politically biting acoustic punk-folk",
          },
        ],
      },
    ],
  },
  {
    id: "world-traditional",
    name: "World & Traditional",
    query: "world traditional music",
    description: "Global cultural expressions, indigenous instruments, polyrhythms, and folk heritage",
    subgenres: [
      {
        id: "african-traditions",
        name: "African Heritage & Highlife",
        query: "afrobeat highlife african music",
        description: "Complex interlocking polyrhythms, call-and-response vocals, and joyful guitar licks",
        subgenres: [
          {
            id: "afrobeat",
            name: "Afrobeat",
            query: "afrobeat fela",
            description: "Large big-band funk fused with Yoruba percussion and potent political activism",
          },
          {
            id: "desert-blues",
            name: "Desert Blues / Tuareg",
            query: "desert blues tuareg",
            description: "Hypnotic Saharan electric guitar riffs, handclaps, and nomadic vocal poetry",
          },
        ],
      },
      {
        id: "middle-eastern",
        name: "Middle Eastern & Mediterranean",
        query: "middle eastern traditional music",
        description: "Microtonal maqam scales, oud, ney flutes, frame drums, and mystical poetry",
        subgenres: [
          {
            id: "anatolian-rock",
            name: "Anatolian Rock / Turkish Psych",
            query: "anatolian rock turkish psych",
            description: "Traditional Turkish folk songs electrified with fuzz guitar and synthesizers",
          },
          {
            id: "klezmer",
            name: "Klezmer",
            query: "klezmer music",
            description: "Joyful Ashkenazi Jewish folk celebration music featuring expressive clarinet and violin",
          },
        ],
      },
      {
        id: "asian-traditional",
        name: "Asian Traditional & Raga",
        query: "asian traditional raga",
        description: "Centuries of modal acoustic meditation, microtonality, and spiritual discipline",
        subgenres: [
          {
            id: "indian-raga",
            name: "Indian Classical & Raga",
            query: "indian classical sitar raga",
            description: "Sitar, sarod, and tabla improvisations following intricate melodic ragas and talas",
          },
          {
            id: "gamelan",
            name: "Indonesian Gamelan",
            query: "indonesian gamelan",
            description: "Shimmering bronze metallophones, tuned gongs, and interlocking cyclical rhythms",
          },
        ],
      },
    ],
  },
  {
    id: "easy-listening-lounge",
    name: "Easy Listening & Lounge",
    query: "easy listening lounge",
    description: "Relaxing orchestrations, smooth cocktail melodies, vintage exotica, and nostalgic muzak",
    subgenres: [
      {
        id: "exotica",
        name: "Exotica & Space Age Pop",
        query: "exotica space age pop",
        description: "Polynesian percussion, bird calls, vibraphones, and tropical mid-century escapism",
        subgenres: [
          {
            id: "space-age-bachelor",
            name: "Space Age Bachelor Pad",
            query: "space age bachelor pad",
            description: "Hi-fi stereo test records, marimbas, Theremins, and quirky brass arrangements",
          },
          {
            id: "tiki-lounge",
            name: "Tiki & Tropical Lounge",
            query: "tiki lounge exotica",
            description: "Lush bamboo flutes, bongos, and relaxing island cocktail soundscapes",
          },
        ],
      },
      {
        id: "library-music",
        name: "Vintage Library & Muzak",
        query: "library music vintage",
        description: "Archival production music recorded for 1960s/70s television, films, and radio",
        subgenres: [
          {
            id: "kpm-sound",
            name: "KPM / Italian Film Score",
            query: "italian soundtrack library music",
            description: "Morricone-inspired brass, funky basslines, and dramatic cinematic orchestrations",
          },
        ],
      },
    ],
  },
];
