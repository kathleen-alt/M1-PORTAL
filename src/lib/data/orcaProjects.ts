import type { Country, Industry, OrcaProject } from "../types";
import { INDUSTRY_META } from "../taxonomy";

// ---------------------------------------------------------------------------
// Orca Coast Playgrounds' REAL historical portfolio.
//
// Organization names, cities, regions, and countries below are taken from Orca
// Coast's published project list. Industry classifications are inferred from
// each project's name/category. `contractValue` and `year` are DERIVED MODELING
// ESTIMATES (computed from the industry value band + a deterministic spread) —
// they are placeholders for real CRM figures, not actual contract data. Swap in
// true values when available; the recommendation engine reads from this set.
//
// International projects (outside CA/US) are omitted because geographic matching
// is scoped to Orca Coast's CA/US target markets.
// ---------------------------------------------------------------------------

interface RawProject {
  name: string;
  industry: Industry;
  city?: string;
  region: string;
  country: Country;
  facilitySqFt?: number;
  website?: string;
  summary?: string;
  /** Real install year, when known (otherwise derived). */
  year?: number;
}

const RAW_PROJECTS: RawProject[] = [
  // YMCA / YWCA
  { name: "YMCA: London, ON", industry: "ymca", city: "London", region: "ON", country: "CA", facilitySqFt: 46_000, summary: "Dinosaur-themed indoor playground adventure for a flagship YMCA." },
  { name: "YMCA City of Rupert, ID", industry: "ymca", city: "Rupert", region: "ID", country: "US", summary: "Engaging indoor play structure for a city YMCA." },
  { name: "YMCA Indoor Playground: Casper, WY", industry: "ymca", city: "Casper", region: "WY", country: "US", summary: "OC100 Series indoor playground for a regional YMCA." },
  { name: "YWCA Beatrice House: Toronto, ON", industry: "ywca", city: "Toronto", region: "ON", country: "CA", summary: "Indoor playground for a YWCA family residence." },

  // Recreation / Community / Municipal
  { name: "Shift Community Recreation Centre: Coaldale, AB", industry: "recreation_center", city: "Coaldale", region: "AB", country: "CA", facilitySqFt: 30_000, summary: "Large-scale commercial playground for a growing community rec centre." },
  { name: "Gillam Recreation & Aquatic Centre, MB", industry: "recreation_center", city: "Gillam", region: "MB", country: "CA", summary: "Indoor playground for a town recreation and aquatic centre." },
  { name: "Shoreview Community Center: Shoreview, MN", industry: "community_center", city: "Shoreview", region: "MN", country: "US", facilitySqFt: 32_000, summary: "Safari-themed playground anchoring a municipal community center." },
  { name: "South Tacoma Community Center: Tacoma, WA", industry: "community_center", city: "Tacoma", region: "WA", country: "US", facilitySqFt: 28_000, summary: "Split-level toddler + youth playground for an urban rec center." },
  { name: "Eagle Ridge Community Centre: Langford, BC", industry: "community_center", city: "Langford", region: "BC", country: "CA", summary: "Gold-mine-themed indoor playground for a community centre." },
  { name: "DLCC Community Centre: Detroit Lakes, MN", industry: "community_center", city: "Detroit Lakes", region: "MN", country: "US", summary: "Backyard-themed indoor toddler play for a community centre." },
  { name: "Detroit Lakes Community & Cultural Center: Detroit Lakes, MN", industry: "community_center", city: "Detroit Lakes", region: "MN", country: "US", summary: "Themed indoor playground for a community & cultural center." },
  { name: "Parkland Crossing: Dauphin, MB", industry: "community_center", city: "Dauphin", region: "MB", country: "CA", summary: "Small-space toddler indoor playground for a community facility." },
  { name: "MNP Play Centre (Spark Centre): Weyburn, SK", industry: "community_center", city: "Weyburn", region: "SK", country: "CA", summary: "Indoor play centre within a credit-union community spark centre." },
  { name: "Edinborough Park Toddler Indoor Playground: Minneapolis, MN", industry: "municipal_recreation", city: "Minneapolis", region: "MN", country: "US", summary: "Toddler indoor playground for a municipal indoor park." },
  { name: "Kin-R-Gee Family Center: Concord, ON", industry: "childrens_activity_center", city: "Concord", region: "ON", country: "CA", summary: "Whimsical forest-themed family center play environment." },

  // Churches
  { name: "Woodlands Church: Woodlands, TX", industry: "large_church", city: "The Woodlands", region: "TX", country: "US", summary: "Indoor children's-ministry playground for a large church." },
  { name: "The Avenue Church: Waxahachie, TX", industry: "large_church", city: "Waxahachie", region: "TX", country: "US", summary: "Playful exploration zone for a growing church." },
  { name: "Severns Valley Baptist Church: Elizabethtown, KY", industry: "large_church", city: "Elizabethtown", region: "KY", country: "US", summary: "Themed indoor playground for a Baptist church." },
  { name: "Redemption Point Church: Ooltewah, TN", industry: "large_church", city: "Ooltewah", region: "TN", country: "US", summary: "Indoor playground for a church children's ministry." },
  { name: "Pantego Bible Church: Fort Worth, TX", industry: "large_church", city: "Fort Worth", region: "TX", country: "US", summary: "Compact indoor playground for a Bible church." },
  { name: "FootHills Community Church: Seneca, SC", industry: "large_church", city: "Seneca", region: "SC", country: "US", summary: "Nature's-playground themed church installation." },
  { name: "First Baptist Church of Coppell: Coppell, TX", industry: "large_church", city: "Coppell", region: "TX", country: "US", summary: "Diverse multi-age indoor playground for a Baptist church." },
  { name: "Fielder Road Baptist Church: Arlington, TX", industry: "large_church", city: "Arlington", region: "TX", country: "US", summary: "Galactic-themed indoor playground for a church." },
  { name: "Faircreek Church: Fairborn, OH", industry: "large_church", city: "Fairborn", region: "OH", country: "US", summary: "Nurturing indoor play space for a church." },

  // Daycare / Childcare
  { name: "Active Start Child Care: Seton, Calgary, AB", industry: "childcare_operator", city: "Calgary", region: "AB", country: "CA", facilitySqFt: 12_000, summary: "The biggest daycare playground in Canada." },
  { name: "Joso's Play and Learn Centre #1: Calgary, AB", industry: "childcare_operator", city: "Calgary", region: "AB", country: "CA", summary: "Innovative play-and-learn childcare playground." },
  { name: "Joso's Play and Learn Centre #2: Calgary, AB", industry: "childcare_operator", city: "Calgary", region: "AB", country: "CA", summary: "Second location play-and-learn childcare playground." },
  { name: "Camp Iliff Child Care: Rockaway, NJ", industry: "childcare_operator", city: "Rockaway", region: "NJ", country: "US", summary: "Themed indoor playground for a childcare provider." },

  // Museums / Aquariums / Science / Aviation / Zoos
  { name: "Kennedy Space Center, FL", industry: "science_center", city: "Merritt Island", region: "FL", country: "US", summary: "Space-exploration themed play environment for a science attraction." },
  { name: "The Living Planet Aquarium: Draper, UT", industry: "aquarium", city: "Draper", region: "UT", country: "US", summary: "Mayan-exploration themed toddler play zone for an aquarium." },
  { name: "Royal Aviation Museum: Winnipeg, MB", industry: "aviation_museum", city: "Winnipeg", region: "MB", country: "CA", summary: "Aviation-themed indoor playground for a museum." },
  { name: "Tundra Grill at Assiniboine Park Zoo: Winnipeg, MB", industry: "museum", city: "Winnipeg", region: "MB", country: "CA", summary: "Polar-themed indoor playground within a zoo attraction." },
  { name: "Polar Bear Habitat: Cochrane, ON", industry: "museum", city: "Cochrane", region: "ON", country: "CA", summary: "Outdoor polar-bear themed playground at a wildlife habitat." },

  // Family Entertainment Centres
  { name: "RecreoFun Family Entertainment Center: Saint-Bruno-de-Montarville, QC", industry: "family_entertainment_center", city: "Saint-Bruno-de-Montarville", region: "QC", country: "CA", summary: "Multi-attraction indoor playground for an FEC." },
  { name: "Fun World Family Fun Centre: Surrey, BC", industry: "family_entertainment_center", city: "Surrey", region: "BC", country: "CA", summary: "Themed indoor playground for a family fun centre." },
  { name: "The Funplex Toddler Playground: East Hanover, NJ", industry: "family_entertainment_center", city: "East Hanover", region: "NJ", country: "US", summary: "Toddler indoor playground within a large FEC." },
  { name: "A Bit Extreme: Lloydminster, AB", industry: "family_entertainment_center", city: "Lloydminster", region: "AB", country: "CA", summary: "Indoor playground for a family fun / trampoline centre." },

  // Trampoline / Sports / Athletic
  { name: "Jump and Shout: Chandler, AZ", industry: "trampoline_park", city: "Chandler", region: "AZ", country: "US", summary: "Indoor playground for a jump / trampoline destination." },
  { name: "Westmont Yard Sports Complex: Westmont, IL", industry: "sports_complex", city: "Westmont", region: "IL", country: "US", summary: "Indoor playground within a sports complex." },
  { name: "Hotshots Indoor Sports Arena: Mt. Pleasant, PA", industry: "sports_complex", city: "Mount Pleasant", region: "PA", country: "US", summary: "Play destination within an indoor sports arena." },
  { name: "Miami Gymnastics & Dance Academy: Miami, FL", industry: "athletic_facility", city: "Miami", region: "FL", country: "US", summary: "Themed indoor playground for a gymnastics & dance academy." },
  { name: "Brick Bodies: Timonium, MD", industry: "athletic_facility", city: "Timonium", region: "MD", country: "US", summary: "Toddler indoor playground within a fitness club." },

  // Resorts / Hotels / RV / Waterparks
  { name: "Kalahari Resorts (Just for Kids): Wisconsin Dells, WI", industry: "resort", city: "Wisconsin Dells", region: "WI", country: "US", summary: "Kids' indoor playground for a destination resort & convention center." },
  { name: "Isleta Casino & Resort: Albuquerque, NM", industry: "resort", city: "Albuquerque", region: "NM", country: "US", summary: "Santa-Fe-style indoor playground for a casino resort." },
  { name: "The Viking Inn Playground: Gimli, MB", industry: "hotel", city: "Gimli", region: "MB", country: "CA", summary: "Themed indoor playground for an inn / hospitality property." },
  { name: "Legacy RV Resorts: Waller, TX", industry: "rv_resort", city: "Waller", region: "TX", country: "US", summary: "Elevated outdoor adventure play for an RV resort." },
  { name: "Splashdown Waterslides: Vernon, BC", industry: "waterpark", city: "Vernon", region: "BC", country: "CA", summary: "Play structure for a waterslide park." },
  { name: "Willow Lake Day Camp: Hopatcong, NJ", industry: "childrens_activity_center", city: "Hopatcong", region: "NJ", country: "US", summary: "Ultimate outdoor play for a day camp." },

  // Indoor playground operators / play cafes / activity centres
  { name: "Jungle Java: Clinton Township, MI", industry: "indoor_playground_operator", city: "Clinton Township", region: "MI", country: "US", summary: "Interactive indoor playground upgrade." },
  { name: "Milestones Development and Play Park: Lubbock, TX", industry: "childrens_activity_center", city: "Lubbock", region: "TX", country: "US", summary: "Development and play park installation." },
  { name: "Zukari: Sainte-Julie, QC", industry: "indoor_playground_operator", city: "Sainte-Julie", region: "QC", country: "CA", summary: "Indoor playground destination." },
  { name: "Woo-Hoo: Vaudreuil, QC", industry: "indoor_playground_operator", city: "Vaudreuil-Dorion", region: "QC", country: "CA", facilitySqFt: 50_000, summary: "Canada's largest indoor playground." },
  { name: "Wild Child Family Play & Party Place: Oneida, NY", industry: "birthday_party_center", city: "Oneida", region: "NY", country: "US", summary: "Themed play and party place." },
  { name: "Tommy K Play: Calgary, AB", industry: "indoor_playground_operator", city: "Calgary", region: "AB", country: "CA", summary: "Indoor playground operator." },
  { name: "The Olds Sandbox: Olds, AB", industry: "indoor_playground_operator", city: "Olds", region: "AB", country: "CA", summary: "Indoor playground." },
  { name: "The Monkey Barrel Indoor Play: Port Elgin, ON", industry: "indoor_playground_operator", city: "Port Elgin", region: "ON", country: "CA", summary: "Creative indoor play centre." },
  { name: "The Adventure Zone: Vancouver, BC", industry: "indoor_playground_operator", city: "Vancouver", region: "BC", country: "CA", summary: "Granville Island indoor playground." },
  { name: "Safari Run: Plano, TX", industry: "indoor_playground_operator", city: "Plano", region: "TX", country: "US", summary: "Safari-themed indoor playground." },
  { name: "Safari Run: Sunnyvale, CA", industry: "indoor_playground_operator", city: "Sunnyvale", region: "CA", country: "US", summary: "Safari-themed indoor playground." },
  { name: "Safari Playground: Walled Lake, MI", industry: "indoor_playground_operator", city: "Walled Lake", region: "MI", country: "US", summary: "Safari-themed indoor playground." },
  { name: "Rocket Kids: Pembroke Pines, FL", industry: "indoor_playground_operator", city: "Pembroke Pines", region: "FL", country: "US", summary: "Galactic-adventure themed indoor playground." },
  { name: "Playtime 4 Kids: Ottawa, ON", industry: "indoor_playground_operator", city: "Ottawa", region: "ON", country: "CA", summary: "Enchanted-castle themed indoor playground." },
  { name: "Parc O' Fun: Saint-Georges, QC", industry: "indoor_playground_operator", city: "Saint-Georges", region: "QC", country: "CA", summary: "Enchanting toddler-and-up indoor play." },
  { name: "Max Adventures: Brooklyn, NY", industry: "indoor_playground_operator", city: "Brooklyn", region: "NY", country: "US", summary: "Urban indoor adventure playground." },
  { name: "Little Goobers: Stoney Creek, ON", industry: "indoor_playground_operator", city: "Stoney Creek", region: "ON", country: "CA", summary: "Forest-themed indoor playground." },
  { name: "Kidscape Indoor Playground: London, ON", industry: "indoor_playground_operator", city: "London", region: "ON", country: "CA", summary: "Mayan-wonders themed indoor playground." },
  { name: "Taima Zone: Mississauga, ON", industry: "indoor_playground_operator", city: "Mississauga", region: "ON", country: "CA", summary: "Indoor playground destination." },
  { name: "Rafiki: Boise, ID", industry: "indoor_playground_operator", city: "Boise", region: "ID", country: "US", summary: "Jungle-excitement themed indoor playground." },
  { name: "Kid City (Archibald St.): Winnipeg, MB", industry: "indoor_playground_operator", city: "Winnipeg", region: "MB", country: "CA", summary: "Indoor playground." },
  { name: "Kango Play Center: Rochester, NY", industry: "indoor_playground_operator", city: "Rochester", region: "NY", country: "US", summary: "Innovative indoor play centre." },
  { name: "Joey's World: Bowmanville, ON", industry: "indoor_playground_operator", city: "Bowmanville", region: "ON", country: "CA", summary: "Urban-adventures themed toddler-and-up play." },
  { name: "Gemmboray Play House: Celebration, FL", industry: "indoor_playground_operator", city: "Celebration", region: "FL", country: "US", summary: "Multi-level indoor play house." },
  { name: "Funmazing Play Centre: Guelph, ON", industry: "indoor_playground_operator", city: "Guelph", region: "ON", country: "CA", summary: "Indoor play centre." },
  { name: "Fort Clarkston: Clarkston, MI", industry: "indoor_playground_operator", city: "Clarkston", region: "MI", country: "US", summary: "Adventure-themed indoor playground." },
  { name: "Curiosity on Court: Brooklyn, NY", industry: "indoor_playground_operator", city: "Brooklyn", region: "NY", country: "US", summary: "Urban indoor playground innovation." },
  { name: "Crazy Catz Indoor Play Centre: Maple Ridge, BC", industry: "indoor_playground_operator", city: "Maple Ridge", region: "BC", country: "CA", summary: "Themed indoor play centre." },
  { name: "Choo-Choo Station: Grapevine, TX", industry: "indoor_playground_operator", city: "Grapevine", region: "TX", country: "US", summary: "Train-themed indoor playground." },
  { name: "Cheeky Monkey Playland: St. Catharines, ON", industry: "indoor_playground_operator", city: "St. Catharines", region: "ON", country: "CA", summary: "Jungle-adventure themed playland." },
  { name: "Cheeky Monkey Playland: Niagara Falls, ON", industry: "indoor_playground_operator", city: "Niagara Falls", region: "ON", country: "CA", summary: "Toddler's-paradise themed playland." },
  { name: "Charlie's Safari: Lacey, WA", industry: "indoor_playground_operator", city: "Lacey", region: "WA", country: "US", summary: "Safari-themed indoor playground." },
  { name: "Aplaydia: Bedford, NS", industry: "indoor_playground_operator", city: "Bedford", region: "NS", country: "CA", summary: "Cartoon-cottage themed indoor playground." },
  { name: "All Kids First Indoor Playground: Vineland, NJ", industry: "indoor_playground_operator", city: "Vineland", region: "NJ", country: "US", summary: "Indoor playground." },
  { name: "The Wiggly Center: Frisco, TX", industry: "indoor_playground_operator", city: "Frisco", region: "TX", country: "US", summary: "Indoor playground." },
  { name: "The Discovery Playhouse: Nipawin, SK", industry: "indoor_playground_operator", city: "Nipawin", region: "SK", country: "CA", summary: "Indoor playhouse." },
  { name: "TayKimTan's Fun Town: Niagara Falls, ON", industry: "indoor_playground_operator", city: "Niagara Falls", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "Speckled Frogs: Burlington, ON", industry: "indoor_playground_operator", city: "Burlington", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "Play Street: Peterborough, ON", industry: "indoor_playground_operator", city: "Peterborough", region: "ON", country: "CA", summary: "Themed indoor playground." },
  { name: "Out of This World: Hillsboro, OR", industry: "indoor_playground_operator", city: "Hillsboro", region: "OR", country: "US", summary: "Space-themed commercial indoor playground." },
  { name: "NUThin' But GOOD TIMES: Merrimack, NH", industry: "indoor_playground_operator", city: "Merrimack", region: "NH", country: "US", summary: "Tropical-themed indoor playground." },
  { name: "KidsPlay-AllDay: Calgary, AB", industry: "indoor_playground_operator", city: "Calgary", region: "AB", country: "CA", summary: "Jungle-themed indoor playground." },
  { name: "Kids Kingdom: Kanata, ON", industry: "indoor_playground_operator", city: "Kanata", region: "ON", country: "CA", summary: "Themed indoor playground." },
  { name: "Jungle Jolt: Webster, NY", industry: "indoor_playground_operator", city: "Webster", region: "NY", country: "US", summary: "Jungle-themed indoor playground." },
  { name: "Fun N' More: Calgary, AB", industry: "indoor_playground_operator", city: "Calgary", region: "AB", country: "CA", summary: "Themed indoor playground." },
  { name: "Jester's Court: Grand Rapids, MI", industry: "indoor_playground_operator", city: "Grand Rapids", region: "MI", country: "US", summary: "Indoor playground." },
  { name: "Kidergy: Bradford, ON", industry: "indoor_playground_operator", city: "Bradford", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "Lil' Monkeys: Burlington, ON", industry: "indoor_playground_operator", city: "Burlington", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "Lost in Fun: Lincoln, NE", industry: "indoor_playground_operator", city: "Lincoln", region: "NE", country: "US", summary: "Indoor playground." },
  { name: "Planet Play: Vaughan, ON", industry: "indoor_playground_operator", city: "Vaughan", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "AllStars Indoor Playland: Edmonton, AB", industry: "indoor_playground_operator", city: "Edmonton", region: "AB", country: "CA", summary: "Indoor playland." },
  { name: "Sharptooth Adventures Playground: Morden, MB", industry: "indoor_playground_operator", city: "Morden", region: "MB", country: "CA", summary: "Dinosaur-themed adventure playground." },
  { name: "Pinpin Entertainment (CJ's Climb and Play): Warman, SK", industry: "indoor_playground_operator", city: "Warman", region: "SK", country: "CA", summary: "Indoor climb-and-play playground." },
  { name: "The Squishy Goose: Cobourg, ON", industry: "indoor_playground_operator", city: "Cobourg", region: "ON", country: "CA", summary: "Indoor playground." },
  { name: "Imaguration: Chatham, NY", industry: "indoor_playground_operator", city: "Chatham", region: "NY", country: "US", summary: "Indoor playground." },

  // Play cafes
  { name: "Kazoom Café: Dollard-des-Ormeaux, QC", industry: "play_cafe", city: "Dollard-des-Ormeaux", region: "QC", country: "CA", summary: "Playhouse-themed indoor play café." },
  { name: "Rebel Space Indoor Playground and Cafe: Upper Tantallon, NS", industry: "play_cafe", city: "Upper Tantallon", region: "NS", country: "CA", summary: "Indoor playground and café." },
  { name: "Let Em' Loose Playland and Cafe: Campbell River, BC", industry: "play_cafe", city: "Campbell River", region: "BC", country: "CA", summary: "Temple-themed playland and café." },
  { name: "Cafe O' Play: Stow, OH", industry: "play_cafe", city: "Stow", region: "OH", country: "US", summary: "Toddler indoor play café." },
  { name: "Hop, Sip, Jump: Calgary, AB", industry: "play_cafe", city: "Calgary", region: "AB", country: "CA", summary: "Café indoor playground." },
];

// ---------------------------------------------------------------------------
// Expanded portfolio (Orca Coast published client list). These add coverage —
// including real precedents for "hidden opportunity" categories such as
// airports, shopping malls, Indigenous nations, apartments, and pediatric
// clinics — and carry organization websites. Duplicates of the detailed list
// above are removed by the dedupe step in build().
// ---------------------------------------------------------------------------
const ADDITIONAL_RAW: RawProject[] = [
  // --- Canada: YMCA ---
  { name: "YMCA Metro: ON", industry: "ymca", region: "ON", country: "CA", website: "ymcaywca.ca" },
  { name: "YMCA of Western Ontario", industry: "ymca", region: "ON", country: "CA", website: "ymcawo.ca" },
  { name: "YMCA Orleans: Ottawa, ON", industry: "ymca", city: "Ottawa", region: "ON", country: "CA", website: "ymcaywca.ca" },

  // --- Canada: Recreation / Municipal / Community ---
  { name: "Chetwynd Recreation Center: Chetwynd, BC", industry: "recreation_center", city: "Chetwynd", region: "BC", country: "CA", website: "gochetwynd.com" },
  { name: "City of Brooks Recreation Center: Brooks, AB", industry: "recreation_center", city: "Brooks", region: "AB", country: "CA", website: "brooks.ca" },
  { name: "City of Langford: Langford, BC", industry: "municipal_recreation", city: "Langford", region: "BC", country: "CA", website: "cityoflangford.ca" },

  // --- Canada: Shopping malls (hidden opportunity) ---
  { name: "Coquitlam Centre: Coquitlam, BC", industry: "shopping_center", city: "Coquitlam", region: "BC", country: "CA", website: "coquitlamcentre.com" },
  { name: "Swift Current Mall: Swift Current, SK", industry: "shopping_center", city: "Swift Current", region: "SK", country: "CA", website: "swiftcurrentmall.com" },

  // --- Canada: Airport (hidden opportunity) ---
  { name: "Toronto Pearson Airport: Toronto, ON", industry: "airport_family_zone", city: "Toronto", region: "ON", country: "CA", website: "torontopearson.com" },

  // --- Canada: Church ---
  { name: "Creekside Church: ON", industry: "large_church", region: "ON", country: "CA", website: "creeksidechurch.ca" },

  // --- Canada: Athletic / clubs / fitness ---
  { name: "Glenco Golf & Country Club: AB", industry: "athletic_facility", region: "AB", country: "CA", website: "glencogolf.org" },
  { name: "The Glencoe Club: Calgary, AB", industry: "athletic_facility", city: "Calgary", region: "AB", country: "CA", website: "glencoe.org" },
  { name: "Whistler Core Fitness Center: Whistler, BC", industry: "athletic_facility", city: "Whistler", region: "BC", country: "CA", website: "whistlercore.com" },
  { name: "Gymanou: QC", industry: "athletic_facility", region: "QC", country: "CA" },

  // --- Canada: FEC / play centres / cafes ---
  { name: "Funplex Entertainment Ltd.: BC", industry: "family_entertainment_center", region: "BC", country: "CA", website: "funplex.ca" },
  { name: "Funtopia: QC", industry: "family_entertainment_center", region: "QC", country: "CA", website: "funtopia.ca" },
  { name: "Kidzone Family Entertainment: Steinbach, MB", industry: "family_entertainment_center", city: "Steinbach", region: "MB", country: "CA" },
  { name: "Shakers Family Fun Centre: Calgary, AB", industry: "family_entertainment_center", city: "Calgary", region: "AB", country: "CA", website: "shakerscalgary.com" },
  { name: "Playtime Entertainment Inc.: Brandon, MB", industry: "family_entertainment_center", city: "Brandon", region: "MB", country: "CA", website: "playtimebrandon.com" },
  { name: "Amazing Adventures Playland: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "amazingadventuresplayland.ca" },
  { name: "Balls of Fun: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "ballsoffun.ca" },
  { name: "High Jinks Indoor Playcare: ON", industry: "childcare_operator", region: "ON", country: "CA" },
  { name: "Just for Kids Playland: MB", industry: "indoor_playground_operator", region: "MB", country: "CA", website: "just4kidz.business.site" },
  { name: "Kid City (Century Street): Winnipeg, MB", industry: "indoor_playground_operator", city: "Winnipeg", region: "MB", country: "CA", website: "kidcitywinnipeg.ca" },
  { name: "Kids Entertainment and Play Centre: SK", industry: "indoor_playground_operator", region: "SK", country: "CA" },
  { name: "Kids Paradise Playground: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "kidsparadiseplayground.com" },
  { name: "Kidtastic Adventures: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "kidtasticadventures.ca" },
  { name: "Maple Moose Adventures: ON", industry: "indoor_playground_operator", region: "ON", country: "CA" },
  { name: "Monkey Around: Ottawa, ON", industry: "indoor_playground_operator", city: "Ottawa", region: "ON", country: "CA", website: "monkeyaroundottawa.com" },
  { name: "Skedaddle Kids Indoor Play Centre: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "skedaddlekids.com" },
  { name: "The Play Pit: ON", industry: "indoor_playground_operator", region: "ON", country: "CA" },
  { name: "YaYa's Play Centre: BC", industry: "indoor_playground_operator", region: "BC", country: "CA" },
  { name: "Zoom Zoom's Indoor Playground: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "zoomzooms.ca" },
  { name: "Zooz Indoor Playground: ON", industry: "indoor_playground_operator", region: "ON", country: "CA", website: "zoozindoorplayground.com" },
  { name: "Atlantis Waterslides: BC", industry: "waterpark", region: "BC", country: "CA", website: "atlantiswaterslides.ca" },

  // --- USA: YMCA ---
  { name: "YMCA Auburn Valley: Auburn, WA", industry: "ymca", city: "Auburn", region: "WA", country: "US", website: "seattleymca.org" },
  { name: "YMCA Hamilton: Chattanooga, TN", industry: "ymca", city: "Chattanooga", region: "TN", country: "US", website: "ymcachattanooga.org" },
  { name: "YMCA of Brandywine Valley: PA", industry: "ymca", region: "PA", country: "US", website: "ymcagbw.org" },
  { name: "YMCA St. Cloud: St. Cloud, MN", industry: "ymca", city: "St. Cloud", region: "MN", country: "US", website: "scymca.org" },

  // --- USA: Parks & Recreation / Municipal / Community (Tier 1) ---
  { name: "City of York Parks & Recreation: York, NE", industry: "parks_recreation", city: "York", region: "NE", country: "US", website: "cityofyork.net" },
  { name: "Naperville Park District: Naperville, IL", industry: "parks_recreation", city: "Naperville", region: "IL", country: "US", website: "napervilleparks.org" },
  { name: "Fort Hill Activity Center (Naperville Park District): Naperville, IL", industry: "municipal_recreation", city: "Naperville", region: "IL", country: "US", website: "napervilleparks.org" },
  { name: "Provo Recreation Center: Provo, UT", industry: "recreation_center", city: "Provo", region: "UT", country: "US", website: "provo.org" },
  { name: "PACC – Perham Area Community Center: Perham, MN", industry: "community_center", city: "Perham", region: "MN", country: "US", website: "perhamareacommunitycenter.net" },
  { name: "Northwest Community Center: TX", industry: "community_center", region: "TX", country: "US" },

  // --- USA: Indigenous nation (hidden opportunity) ---
  { name: "Comanche Nation of Oklahoma: Lawton, OK", industry: "indigenous_community_center", city: "Lawton", region: "OK", country: "US", website: "comanchenation.com" },

  // --- USA: Apartments (hidden opportunity) ---
  { name: "Oaks of Euclid Apartments: Euclid, OH", industry: "apartment_developer", city: "Euclid", region: "OH", country: "US", website: "euclidapartments.com" },

  // --- USA: Pediatric (hidden opportunity) ---
  { name: "Kids Little Smiles: AZ", industry: "pediatric_clinic", region: "AZ", country: "US", website: "kidslittlesmiles.com" },

  // --- USA: Church ---
  { name: "Aviator Church: KS", industry: "large_church", region: "KS", country: "US" },
  { name: "Discovery Bible Fellowship Church: OK", industry: "large_church", region: "OK", country: "US", website: "discovertheone.com" },
  { name: "Faith Life Church: OH", industry: "large_church", region: "OH", country: "US", website: "faithlifechurch.org" },
  { name: "Fellowship of the Parks Church: TX", industry: "multi_campus_church", region: "TX", country: "US", website: "fellowshipoftheparks.com" },
  { name: "First Baptist Church of Hot Springs: AR", industry: "large_church", region: "AR", country: "US" },
  { name: "Florence Baptist Church: Florence, KY", industry: "large_church", city: "Florence", region: "KY", country: "US", website: "florencebaptist.org" },
  { name: "Four Square Church: WA", industry: "large_church", region: "WA", country: "US" },
  { name: "High Point Church: IL", industry: "large_church", region: "IL", country: "US", website: "highpoint.church" },
  { name: "Hillcrest Baptist Church: TX", industry: "large_church", region: "TX", country: "US", website: "hillcrestbc.com" },
  { name: "Mobberly Baptist Church: Longview, TX", industry: "large_church", city: "Longview", region: "TX", country: "US", website: "mobberly.org" },
  { name: "Orchard Road Christian Center: CO", industry: "large_church", region: "CO", country: "US", website: "orcconline.org" },
  { name: "Puyallup Foursquare Church: Puyallup, WA", industry: "large_church", city: "Puyallup", region: "WA", country: "US", website: "myfoursquarechurch.com" },
  { name: "Radiant Church: MI", industry: "multi_campus_church", region: "MI", country: "US", website: "radiant.church" },
  { name: "Grace Church: Riverview, MI", industry: "large_church", city: "Riverview", region: "MI", country: "US", website: "gracechurchmi.com" },
  { name: "The Crossing Church: FL", industry: "multi_campus_church", region: "FL", country: "US", website: "wearecrossing.com" },
  { name: "Trinity Fellowship Church: Amarillo, TX", industry: "multi_campus_church", city: "Amarillo", region: "TX", country: "US", website: "tfc.org" },

  // --- USA: Childcare / preschool / education ---
  { name: "Adventure Kids Playcare – Bellevue, WA", industry: "childcare_operator", city: "Bellevue", region: "WA", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – Issaquah, WA", industry: "childcare_operator", city: "Issaquah", region: "WA", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – Frisco, TX", industry: "childcare_operator", city: "Frisco", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – Katy, TX", industry: "childcare_operator", city: "Katy", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – McKinney, TX", industry: "childcare_operator", city: "McKinney", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – North Dallas, TX", industry: "childcare_operator", city: "Dallas", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – Plano, TX", industry: "childcare_operator", city: "Plano", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "Adventure Kids Playcare – Sugar Land, TX", industry: "childcare_operator", city: "Sugar Land", region: "TX", country: "US", website: "adventurekidsplaycare.com" },
  { name: "For Kids Sake Child Care: MI", industry: "childcare_operator", region: "MI", country: "US" },
  { name: "Kiddie Klub: MI", industry: "childcare_operator", region: "MI", country: "US", website: "kiddieklub.com" },
  { name: "Oakman Child Care & Development: MI", industry: "childcare_operator", region: "MI", country: "US" },
  { name: "Success on the Spectrum: TX", industry: "childcare_operator", region: "TX", country: "US", website: "successonthespectrum.com" },
  { name: "Sunshine Early Learning Childcare Center: OR", industry: "early_learning", region: "OR", country: "US", website: "sunshineelcc.com" },
  { name: "Steam Academy Preschool: IN", industry: "preschool", region: "IN", country: "US", website: "mysteamacademy.com" },
  { name: "Franklin Discovery Academy: UT", industry: "private_school", region: "UT", country: "US", website: "franklindiscovery.org" },

  // --- USA: Athletic / fitness / sports ---
  { name: "Bodies in Motion: ID", industry: "athletic_facility", region: "ID", country: "US", website: "bodiesinmotionidaho.com" },
  { name: "Cedardale Health and Fitness: MA", industry: "athletic_facility", region: "MA", country: "US", website: "cedardale-health.net" },
  { name: "Sports & Health: VA", industry: "athletic_facility", region: "VA", country: "US" },
  { name: "Murrysville Sportzone & Dek Hockey: Murrysville, PA", industry: "sports_complex", city: "Murrysville", region: "PA", country: "US", website: "murrysvillesportzone.com" },
  { name: "Naperville Yard: Naperville, IL", industry: "sports_complex", city: "Naperville", region: "IL", country: "US", website: "napervilleyard.com" },
  { name: "Kids in Motion: WI", industry: "childrens_activity_center", region: "WI", country: "US", website: "kidsinmotionwi.com" },

  // --- USA: FEC / play centres / cafes ---
  { name: "FatCats: UT", industry: "family_entertainment_center", region: "UT", country: "US", website: "fatcatsfun.com" },
  { name: "Prime Time Family Entertainment Center: Abilene, TX", industry: "family_entertainment_center", city: "Abilene", region: "TX", country: "US", website: "primetimeabilene.com" },
  { name: "Provo Beach Resort Fun Center: Provo, UT", industry: "family_entertainment_center", city: "Provo", region: "UT", country: "US", website: "provobeach.com" },
  { name: "Putters Wild: AK", industry: "family_entertainment_center", region: "AK", country: "US", website: "putterswild.com" },
  { name: "Amazement Action Playcenter: MA", industry: "indoor_playground_operator", region: "MA", country: "US", website: "cedarland.net" },
  { name: "Backyard Play Café: ND", industry: "play_cafe", region: "ND", country: "US", website: "backyardplaycafe.com" },
  { name: "Imagination Island: MA", industry: "indoor_playground_operator", region: "MA", country: "US" },
  { name: "My Club House: FL", industry: "indoor_playground_operator", region: "FL", country: "US", website: "myclubhouse.net" },
  { name: "Rocket World: FL", industry: "indoor_playground_operator", region: "FL", country: "US", website: "rocketworldusa.com" },
  { name: "The Giggle Factory: WI", industry: "indoor_playground_operator", region: "WI", country: "US", website: "thegigglefactorykids.com" },
  { name: "Jungle Java – Ann Arbor, MI", industry: "indoor_playground_operator", city: "Ann Arbor", region: "MI", country: "US", website: "junglejavaplay.com" },
  { name: "Jungle Java – Canton, MI", industry: "indoor_playground_operator", city: "Canton", region: "MI", country: "US", website: "junglejavaplay.com" },
  { name: "Jungle Java – Farmington Hills, MI", industry: "indoor_playground_operator", city: "Farmington Hills", region: "MI", country: "US", website: "junglejavaplay.com" },
  { name: "Safari Run – San Mateo, CA", industry: "indoor_playground_operator", city: "San Mateo", region: "CA", country: "US", website: "safarirun.com" },

  // --- From sales project listing (2023–2025) ---
  { name: "Active Start Child Care (Harvest Hill): Edmonton, AB", industry: "childcare_operator", city: "Edmonton", region: "AB", country: "CA", year: 2025 },
  { name: "Kidz Fun Centre: Ajax, ON", industry: "family_entertainment_center", city: "Ajax", region: "ON", country: "CA", year: 2025 },
  { name: "City of Chaska Parks & Recreation: Chaska, MN", industry: "parks_recreation", city: "Chaska", region: "MN", country: "US", year: 2025 },
  { name: "Lake Crystal Rec Center: Lake Crystal, MN", industry: "recreation_center", city: "Lake Crystal", region: "MN", country: "US", year: 2025 },
  { name: "Zwang Inc.: Oakville, ON", industry: "indoor_playground_operator", city: "Oakville", region: "ON", country: "CA", year: 2024 },
  { name: "Playville Kids: Port Perry, ON", industry: "indoor_playground_operator", city: "Port Perry", region: "ON", country: "CA", year: 2024 },
  { name: "Town of Coaldale: Coaldale, AB", industry: "municipal_recreation", city: "Coaldale", region: "AB", country: "CA", year: 2024 },
  { name: "Active Start Child Care (Country Hills): Calgary, AB", industry: "childcare_operator", city: "Calgary", region: "AB", country: "CA", year: 2024 },
  { name: "Little Cubs Family Fun Centre: Port Elgin, ON", industry: "family_entertainment_center", city: "Port Elgin", region: "ON", country: "CA", year: 2024 },
  { name: "Florida State University (Panama City): Panama City, FL", industry: "private_school", city: "Panama City", region: "FL", country: "US", year: 2024 },
  { name: "Premier Recreation Equipment: Orlando, FL", industry: "indoor_playground_operator", city: "Orlando", region: "FL", country: "US", year: 2024 },
  { name: "YMCA of Greater Seattle: Seattle, WA", industry: "ymca", city: "Seattle", region: "WA", country: "US", year: 2024 },
  { name: "Wildlings Play Place: Oregon City, OR", industry: "indoor_playground_operator", city: "Oregon City", region: "OR", country: "US", year: 2024 },
  { name: "YWCA Lubbock: Lubbock, TX", industry: "ywca", city: "Lubbock", region: "TX", country: "US", year: 2024 },
  { name: "Hide N Play Cafe: Lapeer, MI", industry: "play_cafe", city: "Lapeer", region: "MI", country: "US", year: 2023 },
  { name: "Grace Bible Church: Ann Arbor, MI", industry: "large_church", city: "Ann Arbor", region: "MI", country: "US", year: 2023 },
  { name: "Trinity Baptist Church: Ocala, FL", industry: "large_church", city: "Ocala", region: "FL", country: "US", year: 2023 },
  { name: "Play Date MTX: Mansfield, TX", industry: "indoor_playground_operator", city: "Mansfield", region: "TX", country: "US", year: 2023 },
  { name: "Beaches Management: Orlando, FL", industry: "resort", city: "Orlando", region: "FL", country: "US", year: 2023 },
  { name: "Pensionfund Realty (Coquitlam): Coquitlam, BC", industry: "shopping_center", city: "Coquitlam", region: "BC", country: "CA", year: 2023 },
];

/** Stable id from a project name. */
function slug(name: string): string {
  return (
    "proj_" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48)
  );
}

/** Small deterministic hash so derived values are stable across runs. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Derive a representative contract value from the industry value band plus a
 * deterministic spread, and a plausible recent installation year. These stand
 * in for real CRM figures.
 */
function build(raw: RawProject): OrcaProject {
  const id = slug(raw.name);
  const h = hash(id);
  const band = INDUSTRY_META[raw.industry].baseValue;
  const mid = (band.low + band.high) / 2;
  const spread = ((h % 31) - 15) / 100; // -15%..+15%
  const contractValue = Math.round((mid * (1 + spread)) / 5000) * 5000;
  const year = raw.year ?? 2017 + (h % 8); // real year when known, else derived
  return {
    id,
    name: raw.name,
    industry: raw.industry,
    city: raw.city,
    region: raw.region,
    country: raw.country,
    website: raw.website,
    contractValue,
    facilitySqFt: raw.facilitySqFt,
    year,
    summary: raw.summary ?? `${INDUSTRY_META[raw.industry].label} — Orca Coast playground installation.`,
  };
}

// Merge the detailed and expanded lists, removing exact duplicates by id.
const seen = new Set<string>();
export const ORCA_PROJECTS: OrcaProject[] = [...RAW_PROJECTS, ...ADDITIONAL_RAW]
  .map(build)
  .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
