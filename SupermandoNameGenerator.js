class SupermandoNameGenerator {
    constructor() {
        this.categories = {
            medieval: {
                prefix: ["Ar", "Bal", "Ced", "Dun", "El", "Fal", "Gar", "Hal", "Isen", "Jor", "Kel", "Lun", "Mor", "Nor", "Os", "Per", "Quen", "Ral", "Sar", "Thol", "Ul", "Val", "Wil", "Xan", "Yor", "Zal"],
                middle: ["dor", "ric", "win", "bert", "mar", "wyn", "fred", "mund", "gar", "wald", "bald", "helm", "stan", "ton"],
                suffix: ["the Brave", "the Bold", "of Ironforge", "Dragonslayer", "Stormbringer", "the Wise", "the Just", "Oathkeeper", "Swordmaster", "the Noble"],
                format: ["prefix-middle", "prefix-middle suffix"]
            },
            fantasy_elf: {
                prefix: ["Ael", "Ara", "Cal", "Eil", "Fae", "Gal", "Lin", "Mir", "Sil", "Thran", "Ele", "Nim", "Cel", "Thal"],
                middle: ["wen", "dor", "rion", "ith", "las", "dil", "wen", "nor", "rian"],
                suffix: ["el", "iel", "wen", "ion", "dir", "reth", "ath", "del"],
                format: ["prefix-middle-suffix", "prefix-suffix"]
            },
            fantasy_dwarf: {
                prefix: ["Brom", "Durin", "Gim", "Thor", "Bof", "Dwalin", "Thrain", "Gror", "Balin", "Kili", "Fili", "Nor"],
                middle: ["bar", "bur", "dur", "gar", "kor", "mor", "nar", "tor"],
                suffix: ["in", "ur", "im", "or", "ak", "uk"],
                title: ["Ironbeard", "Stonefist", "Deepdelver", "Forgemaster", "Mountainheart", "Axebearer"],
                format: ["prefix-middle-suffix", "prefix-suffix title"]
            },
            fantasy_orc: {
                prefix: ["Grok", "Thrak", "Urok", "Mog", "Drak", "Grul", "Zug", "Mur", "Krog", "Brog", "Skarn", "Gnar"],
                middle: ["gar", "nak", "thar", "mog", "dur", "kar", "zak"],
                suffix: ["ush", "ash", "uk", "ok", "ag", "ig"],
                title: ["the Brutal", "Skullcrusher", "Bloodaxe", "the Fierce", "Bonecrusher", "the Savage"],
                format: ["prefix-suffix", "prefix-middle-suffix", "prefix-suffix title"]
            },
            scientific: {
                prefix: ["Neo", "Proto", "Pseudo", "Hyper", "Ultra", "Meta", "Para", "Poly", "Mono", "Di", "Tri", "Tetra", "Penta", "Hexa", "Iso", "Hetero", "Auto", "Bio", "Geo", "Hydro", "Cryo", "Pyro", "Electro"],
                root: ["morph", "gen", "phage", "cyte", "plasm", "troph", "lysis", "synthesis", "kinesis", "taxis", "stasis", "philia", "phobia", "meter", "scope", "graph"],
                suffix: ["ium", "ide", "ate", "ite", "ase", "ose", "ine", "yl", "ic", "ous", "al"],
                format: ["prefix-root-suffix", "prefix-root"]
            },
            alien_species: {
                prefix: ["Zyr", "Kri", "Vex", "Tho", "Qua", "Xen", "Plo", "Dra", "Ner", "Syl", "Vor", "Tek", "Zal", "Mor"],
                middle: ["tar", "kon", "lix", "ran", "nox", "var", "kul", "zan", "tep", "lom"],
                suffix: ["ian", "oid", "ese", "ite", "ar", "ix", "us", "ax", "on", "un"],
                format: ["prefix-middle-suffix", "prefix-suffix"]
            },
            alien_personal: {
                consonant: ["Z", "X", "K", "V", "Th", "Kr", "Gr", "Sl", "Tr", "Dr", "Pr", "Zr", "Vl"],
                vowel: ["a", "o", "u", "i", "ee", "aa", "oo", "ai", "ou"],
                ending: ["x", "z", "k", "n", "r", "l", "th", "ck"],
                format: ["consonant-vowel-consonant-vowel-ending", "consonant-vowel-ending"]
            },
            cyberpunk: {
                prefix: ["Neuro", "Cyber", "Data", "Net", "Byte", "Digi", "Synaptic", "Chrome", "Neon", "Zero", "Ghost", "Blade", "Razor", "Shadow"],
                middle: ["jack", "runner", "spike", "link", "punk", "hack", "wire", "node", "code", "sync"],
                suffix: ["X", "9", "Prime", "Alpha", "Omega", "Neo", "2077", "404"],
                format: ["prefix-middle", "prefix-middle-suffix", "middle-suffix"]
            },
            native_american: {
                animal: ["Eagle", "Wolf", "Bear", "Hawk", "Raven", "Deer", "Buffalo", "Fox", "Coyote", "Owl"],
                nature: ["Thunder", "Lightning", "Wind", "Rain", "River", "Mountain", "Sky", "Cloud", "Star", "Moon", "Sun"],
                quality: ["Running", "Dancing", "Singing", "Walking", "Flying", "Standing", "Rising", "Falling"],
                format: ["quality animal", "quality nature", "nature animal"]
            },
            japanese: {
                first: ["Aki", "Hiro", "Kenji", "Taka", "Yoshi", "Masa", "Shin", "Ryu", "Kai", "Sora", "Haru", "Natsu"],
                second: ["to", "ro", "ki", "ma", "shi", "ta", "ya", "mi", "ko", "no"],
                surname: ["Tanaka", "Suzuki", "Watanabe", "Takahashi", "Ito", "Nakamura", "Kobayashi", "Yamamoto", "Sato", "Kato"],
                format: ["first-second surname", "surname first-second"]
            },
            viking: {
                prefix: ["Bjorn", "Erik", "Sven", "Ragnar", "Leif", "Olaf", "Thor", "Gunnar", "Harald", "Ivar", "Sigurd", "Ulf"],
                suffix: ["son", "sen", "dottir"],
                title: ["the Red", "Ironside", "Bluetooth", "Bloodaxe", "the Boneless", "Snake-in-Eye", "the Bold", "Hardradi"],
                format: ["prefix-suffix", "prefix title"]
            },
            roman: {
                praenomen: ["Marcus", "Lucius", "Gaius", "Gnaeus", "Quintus", "Titus", "Decimus", "Sextus", "Aulus", "Publius"],
                nomen: ["Julius", "Cornelius", "Claudius", "Flavius", "Aurelius", "Antonius", "Valerius", "Cassius"],
                cognomen: ["Caesar", "Maximus", "Magnus", "Scipio", "Brutus", "Cicero", "Cato", "Sulla", "Pompey"],
                format: ["praenomen nomen", "praenomen nomen cognomen"]
            },
            pirate: {
                prefix: ["Captain", "Admiral", "Commodore", "Blackbeard", "Redbeard", "Ironhook", "Pegleg", "Mad", "Bloody", "Dead"],
                name: ["Jack", "Anne", "Mary", "Edward", "William", "Henry", "Charles", "Francis", "John", "Thomas"],
                suffix: ["the Terrible", "the Cruel", "the Merciless", "Bones", "Beard", "Eye", "Hand", "Tooth"],
                format: ["prefix name", "name suffix", "prefix name suffix"]
            },
            steampunk: {
                prefix: ["Lord", "Lady", "Professor", "Doctor", "Sir", "Madam", "Captain"],
                firstName: ["Reginald", "Cornelius", "Archibald", "Beatrice", "Millicent", "Octavia", "Augustus", "Penelope"],
                title: ["Gearsmith", "Cogsworth", "Steamwright", "Brassbolt", "Ironworks", "Clockwork", "Copperfield"],
                format: ["prefix firstName title", "firstName title"]
            },
            lovecraftian: {
                prefix: ["Azath", "Nyarl", "Shub", "Yog", "Cthul", "Dagon", "Hastur", "Tsath", "Zoth", "Ubbo"],
                middle: ["ggor", "lath", "ogg", "ath", "thul", "nig", "zoth", "sath"],
                suffix: ["oth", "ua", "an", "oth", "ep", "ar", "un", "gua"],
                format: ["prefix-middle-suffix", "prefix-suffix"]
            },
            demon: {
                prefix: ["Baal", "Astar", "Bel", "Meph", "Diab", "Azaz", "Beli", "Mol", "Abad", "Mam", "Levi", "Behe"],
                middle: ["zeb", "oth", "tar", "ist", "loc", "mon"],
                suffix: ["el", "oth", "on", "us", "ael", "os", "is"],
                format: ["prefix-middle-suffix", "prefix-suffix"]
            },
            angelic: {
                prefix: ["Sera", "Cheru", "Micha", "Gabri", "Rapha", "Uri", "Zad", "Aza", "Cas", "Razi", "Hani"],
                suffix: ["el", "iel", "ael", "yon", "im", "on"],
                title: ["the Radiant", "Lightbringer", "the Pure", "Morningstar", "the Blessed"],
                format: ["prefix-suffix", "prefix-suffix title"]
            },
            egyptian: {
                prefix: ["Amen", "Anu", "Ra", "Ptah", "Thot", "Hor", "Set", "Osir", "Bes", "Nef", "Khe"],
                middle: ["hotep", "mes", "ankh", "mose", "nefer", "kare", "pep"],
                suffix: ["is", "es", "us", "et", "en"],
                format: ["prefix-middle", "prefix-middle-suffix"]
            },
            greek: {
                prefix: ["Alex", "Theo", "Aris", "Leon", "Nico", "Demo", "Dio", "Peri", "Soph", "Phil"],
                suffix: ["ander", "doros", "toteles", "idas", "las", "cles", "kles", "s", "n"],
                format: ["prefix-suffix", "prefix"]
            },
            zombie: {
                prefix: ["Rot", "Decay", "Corpse", "Bone", "Flesh", "Dead", "Putrid", "Ghoul", "Groan", "Shamble"],
                suffix: ["walker", "biter", "crawler", "muncher", "gnawer", "feeder", "eater"],
                format: ["prefix-suffix", "prefix"]
            },
            robot: {
                prefix: ["ALPHA", "BETA", "GAMMA", "DELTA", "OMEGA", "SIGMA", "THETA", "PROTO", "MECH", "CYBER", "TECH"],
                number: ["001", "07", "42", "99", "-X", "-Z", "-9000", "-5"],
                suffix: ["UNIT", "BOT", "DROID", "TRON", "PRIME", "MAX"],
                format: ["prefix-number", "prefix-suffix", "prefix-number-suffix"]
            },
            superhero: {
                prefix: ["Captain", "The", "Doctor", "Mister", "Miss", "Lady", "Lord", "Agent", "Professor"],
                adjective: ["Amazing", "Incredible", "Mighty", "Super", "Ultra", "Mega", "Fantastic", "Spectacular", "Invincible"],
                noun: ["Phantom", "Shadow", "Thunder", "Lightning", "Storm", "Blaze", "Fury", "Venom", "Titan", "Hawk", "Falcon"],
                format: ["prefix adjective noun", "adjective noun", "prefix noun"]
            },
            dragon: {
                prefix: ["Drak", "Smaug", "Anc", "Bale", "Faf", "Tia", "Nid", "Vritra", "Orm", "Wyr"],
                middle: ["thul", "gor", "zar", "nor", "mor", "kar"],
                suffix: ["ion", "ax", "oth", "os", "is", "yn"],
                title: ["the Ancient", "Flameheart", "Stormwing", "the Devourer", "Scalebane", "the Eternal"],
                format: ["prefix-middle-suffix", "prefix-suffix title"]
            },
            witch: {
                prefix: ["Morgana", "Circe", "Hexe", "Sabrina", "Agatha", "Wilda", "Ember", "Raven", "Luna", "Salem"],
                suffix: ["black", "thorn", "wood", "moon", "night", "dark", "shadow", "mist"],
                format: ["prefix suffix", "prefix"]
            },
            werewolf: {
                prefix: ["Fenrir", "Lykos", "Amarok", "Convel", "Bardou", "Boris", "Dolph", "Wolfgang", "Rawlins", "Ulric"],
                title: ["Moonclaw", "Nighthowl", "Bloodfang", "Shadowpelt", "Silverbane", "the Cursed", "Fullmoon"],
                format: ["prefix", "prefix title"]
            },
            vampire: {
                prefix: ["Count", "Lord", "Baron", "Marquis", "Duke", "Prince"],
                name: ["Vladislav", "Carmilla", "Lestat", "Nosferatu", "Dracula", "Alucard", "Orlok", "Akasha", "Armand"],
                suffix: ["of Transylvania", "the Impaler", "the Eternal", "the Undying", "Nightborn", "Bloodletter"],
                format: ["prefix name", "name suffix", "prefix name suffix"]
            },
            aztec: {
                prefix: ["Cuauh", "Teo", "Xoco", "Moctez", "Itzco", "Tlal", "Huitzi", "Quetzal"],
                suffix: ["temoc", "coatl", "li", "tzin", "huatl", "lopochtli"],
                format: ["prefix-suffix"]
            },
            celtic: {
                prefix: ["Bran", "Finn", "Conn", "Cormac", "Fergus", "Niall", "Owen", "Rhys", "Taliesin", "Art"],
                suffix: ["mac", "og", "an", "us"],
                title: ["the Blessed", "the Fair", "of the Hundred Battles", "the Wise", "Red Branch"],
                format: ["prefix", "prefix suffix", "prefix title"]
            },
            pokemon: {
                prefix: ["Char", "Bul", "Squir", "Pika", "Jiggl", "Meow", "Psy", "Mach", "Geo", "Volt", "Aqua", "Flam"],
                middle: ["man", "ba", "zu", "tle", "chu", "puff", "duck", "amp", "dude", "orb", "blast"],
                suffix: ["saur", "zard", "eon", "tuff", "nite", "two", "king", "wraith"],
                format: ["prefix-middle", "prefix-suffix", "prefix-middle-suffix"]
            },
            starwars: {
                prefix: ["Obi", "Qui", "Mace", "Ahso", "Plo", "Kit", "Shaak", "Aayla", "Lum", "Kal"],
                middle: ["Wan", "Gon", "Win", "ka", "Koon", "Fis", "Ti", "ina", "ara", "eel"],
                suffix: ["Kenobi", "Jinn", "du", "Tano", "to", "oo", "Se", "cura", "bara"],
                format: ["prefix-middle suffix", "prefix-middle"]
            },
            cosmic: {
                prefix: ["Nebu", "Stel", "Gal", "Cosm", "Astro", "Celest", "Lumin", "Nova", "Quasar", "Pulsar"],
                middle: ["lar", "lax", "mic", "ion", "ia", "ar", "ix"],
                suffix: ["on", "us", "is", "um", "ax", "or"],
                format: ["prefix-middle-suffix", "prefix-suffix"]
            },
            modern_male: {
                firstName: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Andrew", "Paul", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin", "Samuel", "Raymond", "Gregory", "Alexander", "Patrick", "Frank", "Dennis", "Jerry", "Tyler", "Aaron", "Jose", "Adam", "Nathan", "Henry", "Douglas", "Zachary", "Peter", "Kyle", "Noah", "Ethan", "Jeremy", "Walter", "Christian", "Keith", "Roger", "Terry", "Austin", "Sean", "Gerald", "Carl", "Dylan", "Harold", "Jordan", "Jesse", "Bryan", "Lawrence", "Arthur", "Gabriel", "Bruce", "Logan", "Albert", "Willie", "Billy", "Joe", "Alan", "Juan", "Elijah", "Wayne", "Randy", "Eugene", "Vincent", "Russell", "Louis", "Philip", "Bobby", "Johnny", "Bradley"],
                lastName: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez"],
                format: ["firstName lastName"]
            },
            modern_female: {
                firstName: ["Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Carol", "Amanda", "Dorothy", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Emma", "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra", "Rachel", "Carolyn", "Janet", "Catherine", "Maria", "Heather", "Diane", "Ruth", "Julie", "Olivia", "Joyce", "Virginia", "Victoria", "Kelly", "Lauren", "Christina", "Joan", "Evelyn", "Judith", "Megan", "Andrea", "Cheryl", "Hannah", "Jacqueline", "Martha", "Gloria", "Teresa", "Ann", "Sara", "Madison", "Frances", "Kathryn", "Janice", "Jean", "Abigail", "Alice", "Judy", "Sophia", "Grace", "Denise", "Amber", "Doris", "Marilyn", "Danielle", "Beverly", "Isabella", "Theresa", "Diana", "Natalie", "Brittany", "Charlotte", "Marie", "Kayla", "Alexis", "Lori"],
                lastName: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster", "Jimenez"],
                format: ["firstName lastName"]
            },
            caveman: {
                prefix: ["Grok", "Thog", "Ugg", "Oog", "Brog", "Zug", "Mog", "Krog", "Drog", "Grug", "Trog", "Vog", "Wug", "Yog", "Zog"],
                suffix: ["the Strong", "Rock Thrower", "Fire Maker", "Mammoth Hunter", "Cave Dweller", "Big Club", "Stone Fist", "Bone Crusher"],
                format: ["prefix", "prefix suffix"]
            },
            cavewoman: {
                prefix: ["Oona", "Ugga", "Thoga", "Groka", "Zara", "Mora", "Kara", "Loga", "Noga", "Bora", "Foga", "Voga"],
                suffix: ["the Gatherer", "Berry Picker", "Fire Keeper", "Wise One", "Den Mother", "Root Finder"],
                format: ["prefix", "prefix suffix"]
            },
            mobster: {
                prefix: ["Big", "Little", "Fat", "Skinny", "Crazy", "Mad", "Lucky", "Scarface", "Knuckles", "Lefty", "Bugsy"],
                name: ["Tony", "Sal", "Vinnie", "Mickey", "Paulie", "Joey", "Frankie", "Louie", "Carlo", "Vito", "Sonny", "Rocco"],
                lastName: ["Soprano", "Capone", "Gotti", "Gambino", "Luciano", "Corleone", "Costello", "Lansky", "Siegel", "Malone"],
                format: ["prefix name lastName", "name lastName"]
            },
            cowboy: {
                firstName: ["Buck", "Clint", "Wyatt", "Jesse", "Billy", "Cole", "Duke", "Hank", "Rusty", "Shane", "Wade", "Colt", "Dallas", "Dusty"],
                lastName: ["McCoy", "Cassidy", "Earp", "James", "Hickok", "Holliday", "Maverick", "Ringo", "Bridges", "Carson"],
                title: ["the Kid", "Six-Shooter", "the Quick", "Lone Star", "the Drifter"],
                format: ["firstName lastName", "firstName title"]
            },
            ninja: {
                prefix: ["Shadow", "Silent", "Dark", "Hidden", "Swift", "Ghost", "Phantom", "Smoke", "Night", "Death"],
                name: ["Hattori", "Hanzo", "Ninja", "Shinobi", "Ryu", "Kage", "Hayabusa", "Scorpion", "Raiden"],
                suffix: ["Blade", "Strike", "Fist", "Claw", "Wind", "Moon"],
                format: ["prefix name", "name suffix", "prefix suffix"]
            },
            samurai: {
                name: ["Miyamoto", "Oda", "Tokugawa", "Takeda", "Uesugi", "Date", "Sanada", "Shimazu", "Mori", "Hojo"],
                firstName: ["Musashi", "Nobunaga", "Ieyasu", "Shingen", "Kenshin", "Masamune", "Yukimura", "Yoshihiro"],
                title: ["the Swordmaster", "the Undefeated", "the Demon", "the Dragon", "the Tiger"],
                format: ["firstName name", "name firstName", "firstName name title"]
            },
            wizard_modern: {
                firstName: ["Albus", "Gandalf", "Merlin", "Radagast", "Elminster", "Raistlin", "Fizban", "Mordenkainen", "Bigby"],
                title: ["the Grey", "the White", "the Wise", "the Brown", "Stormcrow", "Greyhawk", "the Red"],
                format: ["firstName", "firstName title"]
            },
            witch_modern: {
                firstName: ["Hermione", "Willow", "Sabrina", "Glinda", "Elphaba", "Minerva", "Bellatrix", "Circe", "Morgana", "Ursula"],
                lastName: ["Granger", "Rosenberg", "Spellman", "McGonagall", "Lestrange", "le Fay", "Harkness"],
                format: ["firstName", "firstName lastName"]
            },
            fairy: {
                prefix: ["Tinker", "Glimmer", "Shimmer", "Sparkle", "Flutter", "Twinkle", "Petal", "Blossom", "Dew", "Moon", "Star", "Sun"],
                suffix: ["bell", "wing", "dust", "shine", "glow", "light", "bloom", "wisp"],
                format: ["prefix-suffix", "prefix"]
            },
            mermaid: {
                prefix: ["Coral", "Marina", "Pearl", "Aqua", "Oceana", "Serena", "Ariel", "Nixie", "Nere", "Calypso", "Thalassa"],
                suffix: ["tide", "wave", "song", "fin", "shell", "sea"],
                format: ["prefix", "prefix-suffix"]
            },
            merman: {
                prefix: ["Triton", "Poseidon", "Neptune", "Dylan", "Maren", "Morvan", "Caspian", "Kai", "Marsh", "Wade"],
                title: ["Seafarer", "Wavebreaker", "Tidecaller", "Stormrider", "Deepdiver"],
                format: ["prefix", "prefix title"]
            },
            alien_scientist: {
                prefix: ["Dr.", "Professor", "Researcher", "Xenobiologist", "Chief Scientist"],
                alienName: ["Zxyrlok", "Thranix", "Quelvor", "Vrexan", "Zoltar", "Klyntar", "Vortigon"],
                number: ["-7", "-12", "-Prime", "-Alpha", " III", " IX"],
                format: ["prefix alienName", "alienName number"]
            },
            space_captain: {
                rank: ["Captain", "Commander", "Admiral", "Commodore", "Lieutenant"],
                firstName: ["James", "Jean-Luc", "Kathryn", "Benjamin", "Jonathan", "John", "Malcolm", "Carol"],
                lastName: ["Kirk", "Picard", "Janeway", "Sisko", "Archer", "Sheridan", "Reynolds", "Marcus", "Shepard"],
                format: ["rank firstName lastName", "firstName lastName"]
            },
            demon_hunter: {
                firstName: ["Dante", "Nero", "Vergil", "Alucard", "Blade", "Constantine", "Hellboy", "Van Helsing", "Buffy", "Dean", "Sam"],
                lastName: ["Belmont", "Winchester", "Constantine", "Helsing", "Summers", "Sparda"],
                format: ["firstName", "firstName lastName"]
            },
            ghost: {
                prefix: ["The Ghost of", "The Phantom of", "The Specter of", "The Wraith of", "The Shade of"],
                place: ["the Opera", "Christmas Past", "the Manor", "the Tower", "the Graveyard", "Hollow Hill"],
                name: ["Casper", "Slimer", "Beetlejuice", "Boo", "Banquo"],
                format: ["prefix place", "name"]
            },
            frankenstein: {
                prefix: ["Dr.", "Professor", "Mad Scientist"],
                name: ["Frankenstein", "Jekyll", "Moreau", "Herbert West", "Frankenstein Jr."],
                title: ["the Creator", "the Mad", "Reanimator"],
                format: ["prefix name", "name title"]
            },
            serial_killer: {
                prefix: ["The", "Killer", "Slayer", "Butcher", "Strangler", "Ripper"],
                descriptor: ["Zodiac", "Nightstalker", "Iceman", "Hillside", "Boston", "Green River", "BTK"],
                format: ["prefix descriptor"]
            },
            detective: {
                title: ["Detective", "Inspector", "Agent", "Private Eye", "Investigator"],
                firstName: ["Sherlock", "Hercule", "Miss", "Sam", "Philip", "Jessica", "Columbo", "Veronica", "Nancy"],
                lastName: ["Holmes", "Poirot", "Marple", "Spade", "Marlowe", "Fletcher", "Mars", "Drew"],
                format: ["title firstName lastName", "firstName lastName"]
            },
            spy: {
                code: ["Agent", "Operative", "Asset", "Double-O"],
                name: ["007", "Black Widow", "Bourne", "Hunt", "Salt", "Impossible"],
                number: ["7", "13", "99", "47"],
                format: ["code number", "name"]
            },
            gladiator: {
                name: ["Maximus", "Spartacus", "Commodus", "Proximo", "Tigris", "Verus", "Priscus", "Flamma"],
                title: ["the Victor", "the Champion", "the Undefeated", "the Spaniard", "the Thracian", "the Savage"],
                format: ["name", "name title"]
            },
            pro_wrestler: {
                prefix: ["The", "Macho Man", "Stone Cold", "The Rock", "Ultimate", "Rowdy", "Superstar"],
                name: ["Warrior", "Savage", "Hogan", "Undertaker", "Kane", "Piper", "Flair", "Austin"],
                suffix: ["Brother", "Dude", "Man"],
                format: ["prefix name", "name suffix", "name"]
            },
            rockstar: {
                firstName: ["Axl", "Slash", "Ozzy", "Bono", "Sting", "Prince", "Slash", "Edge", "Bowie", "Jagger", "Elvis"],
                stageName: ["The King", "The Boss", "The Duke", "Ziggy Stardust"],
                format: ["firstName", "stageName", "firstName stageName"]
            },
            rapper: {
                prefix: ["Lil", "Big", "Young", "MC", "DJ", "Ice", "Dr.", "Snoop"],
                name: ["Wayne", "Pump", "Sean", "Hammer", "Cube", "Dre", "Dogg", "Chainz", "Yachty"],
                suffix: ["Dawg", "Dogg", "the Don", "Jr."],
                format: ["prefix name", "name suffix", "prefix name suffix"]
            },
            mad_scientist: {
                prefix: ["Dr.", "Professor", "Mad", "Crazy"],
                firstName: ["Emmett", "Ivo", "Victor", "Otto", "Curtis", "Henry", "Rudolph"],
                lastName: ["Brown", "Robotnik", "Frankenstein", "Octavius", "Connors", "Jekyll", "Carnage"],
                format: ["prefix firstName lastName", "firstName lastName"]
            },
            time_traveler: {
                name: ["The Doctor", "Marty McFly", "Doc Brown", "Bill", "Ted", "Flash Gordon", "Buck Rogers"],
                title: ["of Gallifrey", "the Time Lord", "from the Future", "Time Agent"],
                format: ["name", "name title"]
            },
            kaiju: {
                prefix: ["Godzilla", "Mothra", "Rodan", "Ghidorah", "Gamera", "Mechagodzilla"],
                descriptor: ["King of Monsters", "the Divine Moth", "Fire Demon", "Three-Headed Monster"],
                format: ["prefix", "prefix descriptor"]
            },
            biblical: {
                name: ["Abraham", "Moses", "David", "Solomon", "Isaiah", "Jeremiah", "Daniel", "Elijah", "Noah", "Adam", "Jacob", "Joseph", "Joshua", "Samuel", "Ezekiel", "Job", "Ruth", "Esther", "Deborah", "Sarah", "Rebecca", "Rachel", "Mary", "Martha", "Magdalene"],
                title: ["the Prophet", "the King", "the Wise", "the Shepherd", "the Deliverer"],
                format: ["name", "name title"]
            },
            archangel: {
                name: ["Michael", "Gabriel", "Raphael", "Uriel", "Azrael", "Metatron", "Sandalphon", "Raguel", "Remiel", "Sariel"],
                title: ["Archangel", "Seraphim", "Cherubim", "Herald of God", "Voice of God"],
                format: ["name", "name title"]
            },
            fallen_angel: {
                name: ["Lucifer", "Azazel", "Belial", "Beelzebub", "Leviathan", "Asmodeus", "Mammon", "Belphegor"],
                title: ["Morningstar", "the Fallen", "Prince of Hell", "Lord of Flies", "the Adversary"],
                format: ["name", "name title"]
            },
            greek_god: {
                name: ["Zeus", "Poseidon", "Hades", "Apollo", "Ares", "Hermes", "Dionysus", "Hephaestus", "Athena", "Artemis", "Aphrodite", "Hera", "Demeter", "Hestia", "Persephone"],
                title: ["King of Gods", "God of the Sea", "Lord of the Underworld", "God of War", "Goddess of Wisdom", "Goddess of Love"],
                format: ["name", "name title"]
            },
            norse_god: {
                name: ["Odin", "Thor", "Loki", "Freya", "Frigg", "Baldur", "Tyr", "Heimdall", "Hel", "Fenrir", "Jormungandr"],
                title: ["Allfather", "God of Thunder", "Trickster God", "Goddess of Love", "Guardian of Bifrost"],
                format: ["name", "name title"]
            },
            titan: {
                name: ["Cronus", "Rhea", "Oceanus", "Hyperion", "Prometheus", "Atlas", "Helios", "Selene", "Eos"],
                title: ["Father of Gods", "Bearer of Heaven", "Bringer of Fire", "Holder of the Sky"],
                format: ["name", "name title"]
            },
            video_game_boss: {
                prefix: ["Dark", "Shadow", "Ancient", "Corrupted", "Corrupted", "Chaos", "Ultimate", "Final"],
                name: ["Lord", "King", "Emperor", "Overlord", "Master", "Dragon", "Beast", "Demon"],
                suffix: ["of Darkness", "of Destruction", "of Chaos", "the Destroyer", "the Eternal"],
                format: ["prefix name", "name suffix", "prefix name suffix"]
            },
            final_fantasy: {
                firstName: ["Cloud", "Squall", "Tidus", "Zidane", "Vaan", "Lightning", "Noctis", "Cecil", "Terra", "Yuna"],
                lastName: ["Strife", "Leonhart", "Tribal", "Highwind", "Lockhart", "Farron", "Caelum"],
                format: ["firstName", "firstName lastName"]
            },
            dark_souls: {
                title: ["Lord of", "Knight of", "Heir of", "Champion of", "Seeker of"],
                descriptor: ["Cinder", "Sunlight", "Darkness", "Fire", "Ash", "the Abyss", "Anor Londo"],
                name: ["Artorias", "Ornstein", "Gwyn", "Solaire", "Siegmeyer", "Patches"],
                format: ["title descriptor", "name"]
            },
            elder_scrolls: {
                race: ["Nord", "Imperial", "Breton", "Redguard", "Altmer", "Bosmer", "Dunmer", "Orsimer", "Khajiit", "Argonian"],
                title: ["Dragonborn", "Nerevarine", "Champion of Cyrodiil", "Listener", "Archmage", "Harbinger"],
                format: ["race", "title"]
            },
            world_of_warcraft: {
                name: ["Thrall", "Arthas", "Illidan", "Sylvanas", "Jaina", "Anduin", "Varian", "Gul'dan", "Garrosh"],
                title: ["Warchief", "Lich King", "Betrayer", "Banshee Queen", "Proudmoore", "Wrynn", "Hellscream"],
                format: ["name", "name title"]
            },
            fortnite: {
                adjective: ["Elite", "Legendary", "Epic", "Rare", "Victory", "Battle", "Royal", "Storm"],
                noun: ["Agent", "Trooper", "Warrior", "Ranger", "Knight", "Scout", "Assassin", "Commando"],
                skin: ["Jonesy", "Ramirez", "Wildcat", "Headhunter", "Renegade"],
                format: ["adjective noun", "skin"]
            },
            league_of_legends: {
                champion: ["Garen", "Lux", "Darius", "Yasuo", "Zed", "Ahri", "Jinx", "Vi", "Ekko", "Thresh", "Braum", "Ashe"],
                title: ["the Might of Demacia", "Lady of Luminosity", "Hand of Noxus", "Unforgiven", "Master of Shadows"],
                format: ["champion", "champion title"]
            },
            minecraft: {
                prefix: ["Steve", "Alex", "Herobrine", "Notch", "Ender", "Creeper", "Diamond", "Netherite"],
                suffix: ["Miner", "Builder", "Crafter", "Warrior", "Knight", "Master"],
                format: ["prefix", "prefix suffix"]
            },
            Among_Us: {
                color: ["Red", "Blue", "Green", "Pink", "Orange", "Yellow", "Black", "White", "Purple", "Brown", "Cyan", "Lime"],
                role: ["Crewmate", "Impostor", "Sus", "the Imposter"],
                format: ["color", "color role"]
            },
            tiktok_username: {
                adjective: ["real", "official", "its", "ur", "the", "lil", "big", "og"],
                word: ["vibes", "mood", "energy", "aesthetic", "main", "stan", "chaos", "tea"],
                suffix: ["xo", "fr", "periodt", "oop", "bestie", "bby"],
                format: ["adjective word", "word suffix"]
            },
            twitch_streamer: {
                prefix: ["xX", "Xx", "Pro", "Ninja", "The", "TTV", "YT"],
                name: ["Gamer", "Slayer", "King", "Queen", "Legend", "Beast", "Ace", "Noob"],
                suffix: ["Xx", "xX", "TV", "Live", "69", "420", "Pro"],
                format: ["prefix name suffix", "name suffix"]
            },
            esports_player: {
                prefix: ["FaZe", "Team", "TSM", "C9", "G2"],
                handle: ["Shroud", "Faker", "s1mple", "Ninja", "Pewdiepie", "Tfue", "Myth"],
                format: ["prefix handle", "handle"]
            },
            youtube_gamer: {
                prefix: ["PewDie", "Markiplier", "Jacksepticeye", "DanTDM", "VanossGaming"],
                style: ["Plays", "Gaming", "Live", "LP", "Reacts"],
                format: ["prefix", "prefix style"]
            },
            phoneme_based: {
                consonant: ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "qu", "r", "s", "t", "v", "w", "x", "y", "z",
                    "br", "cr", "dr", "fr", "gr", "pr", "tr", "bl", "cl", "fl", "gl", "pl", "sl",
                    "ch", "sh", "th", "wh", "ph", "gh", "ck", "ng", "st", "sp", "sc", "sk", "sm", "sn", "sw"],
                vowel: ["a", "e", "i", "o", "u", "ai", "ay", "ea", "ee", "ei", "ey", "ie", "oa", "oo", "ou", "ow", "ue", "ui"],
                syllableStart: ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z",
                    "br", "cr", "dr", "fr", "gr", "pr", "tr", "bl", "cl", "fl", "gl", "pl", "sl",
                    "ch", "sh", "th", "ph", "st", "sp", "sc", "sk", "sm", "sn", "sw"],
                syllableMiddle: ["a", "e", "i", "o", "u", "ai", "ay", "ea", "ee", "oa", "oo", "ou"],
                syllableEnd: ["b", "d", "g", "k", "l", "m", "n", "p", "r", "s", "t", "x", "z",
                    "ck", "ft", "ld", "lf", "lk", "lm", "lp", "lt", "mp", "nd", "ng", "nk", "nt", "pt", "rd", "rk", "rm", "rn", "rp", "rt", "sk", "sp", "st"],
                format: ["syllableStart-syllableMiddle-syllableEnd",
                    "syllableStart-syllableMiddle-syllableEnd-syllableStart-syllableMiddle",
                    "syllableStart-syllableMiddle-syllableEnd-syllableStart-syllableMiddle-syllableEnd"]
            }
        };
    }

    static random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    static randomFormat(formats) {
        return SupermandoNameGenerator.random(formats);
    }

    generate(category) {
        if (!this.categories[category]) {
            return `Category '${category}' not found. Available: ${this.listCategories().join(', ')}`;
        }

        // Special handling for phoneme_based category
        if (category === 'phoneme_based') {
            return this.generatePhoneme(Math.floor(Math.random() * 3) + 2); // 2-4 syllables
        }

        const data = this.categories[category];
        const format = SupermandoNameGenerator.randomFormat(data.format);
        const parts = format.split(' ');

        return parts.map(part => {
            const subParts = part.split('-');
            return subParts.map(subPart => {
                const array = data[subPart];
                return array ? SupermandoNameGenerator.random(array) : '';
            }).join('');
        }).join(' ');
    }

    generateRandom() {
        const categories = this.listCategories();
        const randomCategory = SupermandoNameGenerator.random(categories);
        return this.generate(randomCategory);
    }

    listCategories() {
        return Object.keys(this.categories);
    }

    addCategory(name, categoryData) {
        if (!categoryData.format) {
            throw new Error('Category must include a format array');
        }
        this.categories[name] = categoryData;
    }

    generateMultiple(category, count = 5) {
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(this.generate(category));
        }
        return names;
    }

    generateFromAllCategories() {
        const categories = this.listCategories();
        const results = {};
        categories.forEach(cat => {
            results[cat] = this.generate(cat);
        });
        return results;
    }

    generatePhoneme(syllableCount = 2) {
        if (syllableCount < 1 || syllableCount > 5) {
            throw new Error('syllableCount must be between 1 and 5');
        }

        const data = this.categories.phoneme_based;
        let name = '';

        for (let i = 0; i < syllableCount; i++) {
            const syllable =
                SupermandoNameGenerator.random(data.syllableStart) +
                SupermandoNameGenerator.random(data.syllableMiddle) +
                (Math.random() > 0.3 ? SupermandoNameGenerator.random(data.syllableEnd) : '');
            name += syllable;
        }

        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    generatePhonemeMultiple(syllableCount = 2, count = 5) {
        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(this.generatePhoneme(syllableCount));
        }
        return names;
    }

    generateRandomCrazy(chunkCount = 3) {
        if (chunkCount < 1 || chunkCount > 10) {
            throw new Error('chunkCount must be between 1 and 10');
        }

        const categories = this.listCategories();
        const nameParts = [];

        while (nameParts.length < chunkCount) {
            // 30% chance to use phoneme generation
            if (Math.random() < 0.3) {
                const phonemeName = this.generatePhoneme(Math.floor(Math.random() * 2) + 1);
                // Ensure capitalization (should already be done, but double-check)
                const capitalizedPhoneme = phonemeName.charAt(0).toUpperCase() + phonemeName.slice(1);
                nameParts.push(capitalizedPhoneme);
                continue;
            }

            // Otherwise use existing category logic
            const randomCategory = SupermandoNameGenerator.random(categories.filter(cat => cat !== 'phoneme_based'));
            const data = this.categories[randomCategory];

            const format = SupermandoNameGenerator.randomFormat(data.format);
            const parts = format.split(' ');

            const randomPart = SupermandoNameGenerator.random(parts);
            const subParts = randomPart.split('-');

            const chunk = subParts.map(subPart => {
                const array = data[subPart];
                return array ? SupermandoNameGenerator.random(array) : '';
            }).filter(part => part).join('');

            if (chunk) {
                const capitalizedChunk = chunk.charAt(0).toUpperCase() + chunk.slice(1);
                nameParts.push(capitalizedChunk);
            }
        }

        return nameParts.join(' ');
    }

    generateSentence(name1 = null, name2 = null, options = {}) {
        const {
            complexity = 'medium', // 'simple', 'medium', 'complex'
            tone = 'neutral', // 'neutral', 'epic', 'humorous', 'dark', 'romantic'
            tense = 'mixed', // 'past', 'present', 'future', 'mixed'
            includeDialogue = false,
            minClauses = 1,
            maxClauses = 3
        } = options;

        // Advanced template system with metadata
        const templateLibrary = {
            simple: [
                { pattern: "{name1} {verb} {adverb} {location}", weight: 2 },
                { pattern: "{name1} {verb} {object}", weight: 2 },
                { pattern: "{name1} is {adjective}", weight: 1 }
            ],
            medium: [
                { pattern: "{name1} {verb} {object} while {gerund} {location}", weight: 3 },
                { pattern: "{name1}, who is {adjective}, {verb} {object} {time}", weight: 2 },
                { pattern: "As {name1} {verb} {adverb}, {subject_pronoun} {verb2} {object}", weight: 2 },
                { pattern: "{name1} {verb} {object}, {gerund} {adverb} {location}", weight: 2 },
                { pattern: "Though {name1} is {adjective}, {subject_pronoun} {verb} {object} {time}", weight: 2 }
            ],
            complex: [
                { pattern: "{name1}, the {adjective} {title}, {verb} {object} because {clause}", weight: 3 },
                { pattern: "Despite {gerund} {object}, {name1} {verb} {adverb} when {condition}", weight: 2 },
                { pattern: "{name1} {verb} {object} {time}, which {consequence}, until {event}", weight: 2 },
                { pattern: "If {name1} {verb} {object}, then {subject_pronoun} will {verb2} {adverb} {location}", weight: 2 },
                { pattern: "{name1} {verb} not only {object} but also {object2}, {gerund} {result}", weight: 1 }
            ],
            duo_simple: [
                { pattern: "{name1} and {name2} {verb} {adverb}", weight: 2 },
                { pattern: "{name1} {verb} {name2} {location}", weight: 2 }
            ],
            duo_medium: [
                { pattern: "{name1} and {name2}, both {adjective}, {verb} {object} {time}", weight: 2 },
                { pattern: "While {name1} {verb} {object}, {name2} {verb2} {adverb} {location}", weight: 3 },
                { pattern: "{name1} {verb} {name2} to {infinitive} {object}", weight: 2 },
                { pattern: "Together, {name1} and {name2} {verb} {object}, {gerund} {result}", weight: 2 }
            ],
            duo_complex: [
                { pattern: "{name1}, unlike {name2}, {verb} {object} because {clause}", weight: 2 },
                { pattern: "When {name1} {verb} {object}, {name2} {verb2} {adverb}, causing {consequence}", weight: 2 },
                { pattern: "{name1} and {name2} {verb} {object} until {event}, whereupon {subject_pronoun_plural} {verb2} {location}", weight: 2 },
                { pattern: "Despite {name2}'s {quality}, {name1} {verb} {object}, leading {name2} to {infinitive} {adverb}", weight: 1 }
            ]
        };

        // Enhanced vocabulary with contextual tags
        const vocabulary = {
            verbs: {
                physical: ["battle", "dance", "run", "climb", "swim", "leap", "charge", "sprint", "vault"],
                mental: ["contemplate", "discover", "realize", "understand", "dream", "imagine", "scheme", "plot"],
                social: ["betray", "befriend", "challenge", "inspire", "deceive", "trust", "unite", "confront"],
                magical: ["enchant", "curse", "summon", "banish", "transform", "conjure", "hex", "bless"],
                combat: ["strike", "defend", "parry", "assault", "ambush", "duel", "conquer", "vanquish"]
            },

            adverbs: {
                manner: ["gracefully", "fiercely", "cunningly", "recklessly", "methodically", "frantically"],
                intensity: ["intensely", "passionately", "desperately", "relentlessly", "zealously"],
                secrecy: ["secretly", "mysteriously", "covertly", "stealthily", "discreetly"],
                time: ["eternally", "momentarily", "gradually", "suddenly", "perpetually"]
            },

            adjectives: {
                personality: ["cunning", "noble", "treacherous", "valiant", "enigmatic", "ruthless"],
                physical: ["towering", "agile", "formidable", "ethereal", "scarred", "radiant"],
                reputation: ["legendary", "infamous", "renowned", "notorious", "revered", "feared"]
            },

            objects: [
                "the Blade of Eternity", "an ancient grimoire", "the Lost Crown", "a cursed amulet",
                "the Dragon's Eye", "a forbidden artifact", "the Sacred Chalice", "a mystical orb",
                "the Sword of Truth", "a phoenix feather", "the Shadow Cloak", "a blood diamond"
            ],

            locations: [
                "atop the Obsidian Spire", "within the Whispering Woods", "beneath the Crimson Moon",
                "across the Shattered Wastes", "inside the Void Temple", "beyond the Mist Veil",
                "at the World's Edge", "through the Crystal Caverns", "among the Fallen Stars"
            ],

            times: [
                "at the stroke of midnight", "during the Blood Moon", "as dawn breaks",
                "when the stars align", "before the prophecy unfolds", "after the Great Silence",
                "in the Age of Shadow", "during the Eternal Night", "when time itself fractures"
            ],

            titles: [
                "Warrior", "Sage", "Rogue", "Champion", "Oracle", "Mercenary", "Assassin",
                "Paladin", "Warlock", "Wanderer", "Sentinel", "Harbinger"
            ],

            qualities: [
                "unwavering loyalty", "burning ambition", "hidden strength", "dark past",
                "mysterious power", "sacred duty", "terrible curse", "ancient wisdom"
            ],

            consequences: [
                "shattered the ancient seal", "awakened a dormant evil", "fulfilled the prophecy",
                "triggered a cascade of events", "altered the course of destiny", "unleashed chaos"
            ],

            conditions: [
                "the moon wanes", "darkness falls", "the enemy approaches", "hope fades",
                "the ritual completes", "the portal opens", "the truth emerges"
            ],

            clauses: [
                "destiny demanded it", "the prophecy foretold this moment", "vengeance consumed their heart",
                "honor required sacrifice", "the gods had decreed it", "darkness threatened everything"
            ],

            results: [
                "thereby sealing their fate", "thus changing history forever", "ultimately proving their worth",
                "consequently dooming them all", "forever altering the balance"
            ]
        };

        // Grammar helper functions
        const grammar = {
            getSubjectPronoun: (name, plural = false) => {
                if (plural) return "they";
                return Math.random() > 0.5 ? "they" : "he/she";
            },

            getPossessive: (name) => `${name}'s`,

            conjugateVerb: (verb, tense, thirdPerson = true) => {
                if (tense === 'past') {
                    const irregular = {
                        'run': 'ran', 'fight': 'fought', 'fly': 'flew', 'swim': 'swam',
                        'strike': 'struck', 'find': 'found', 'stand': 'stood'
                    };
                    return irregular[verb] || verb + 'ed';
                } else if (tense === 'future') {
                    return 'will ' + verb;
                } else if (tense === 'present' && thirdPerson) {
                    return verb.endsWith('s') ? verb + 'es' : verb + 's';
                }
                return verb;
            },

            toGerund: (verb) => {
                if (verb.endsWith('e')) return verb.slice(0, -1) + 'ing';
                return verb + 'ing';
            },

            toInfinitive: (verb) => verb
        };

        // Generate names if not provided
        if (!name1) {
            name1 = this.generateRandom ? this.generateRandom() : "The Wanderer";
        }

        // Determine if using two names
        const useTwoNames = name2 !== null && name2 !== undefined;
        if (!useTwoNames && Math.random() > 0.7) {
            name2 = this.generateRandom ? this.generateRandom() : "The Shadow";
        }

        const hasTwoNames = name2 !== null && name2 !== undefined;

        // Select template based on complexity and name count
        const complexityKey = complexity === 'simple' ? 'simple' :
            complexity === 'complex' ? 'complex' : 'medium';
        const templateKey = hasTwoNames ? `duo_${complexityKey}` : complexityKey;
        const templates = templateLibrary[templateKey];

        // Weighted random selection
        const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedTemplate = templates[0].pattern;

        for (const template of templates) {
            random -= template.weight;
            if (random <= 0) {
                selectedTemplate = template.pattern;
                break;
            }
        }

        // Determine tense
        const actualTense = tense === 'mixed'
            ? ['past', 'present', 'future'][Math.floor(Math.random() * 3)]
            : tense;

        // Helper to get random from category
        const getRandom = (category) => {
            if (Array.isArray(category)) {
                return category[Math.floor(Math.random() * category.length)];
            }
            const allItems = Object.values(category).flat();
            return allItems[Math.floor(Math.random() * allItems.length)];
        };

        // Build replacement map with advanced features
        const verb = getRandom(vocabulary.verbs);
        const verb2 = getRandom(vocabulary.verbs);

        const replacements = {
            '{name1}': name1,
            '{name2}': name2 || '',
            '{verb}': grammar.conjugateVerb(verb, actualTense),
            '{verb2}': grammar.conjugateVerb(verb2, actualTense),
            '{adverb}': getRandom(vocabulary.adverbs),
            '{adjective}': getRandom(vocabulary.adjectives),
            '{object}': getRandom(vocabulary.objects),
            '{object2}': getRandom(vocabulary.objects),
            '{location}': getRandom(vocabulary.locations),
            '{time}': getRandom(vocabulary.times),
            '{title}': getRandom(vocabulary.titles),
            '{quality}': getRandom(vocabulary.qualities),
            '{consequence}': getRandom(vocabulary.consequences),
            '{condition}': getRandom(vocabulary.conditions),
            '{clause}': getRandom(vocabulary.clauses),
            '{result}': getRandom(vocabulary.results),
            '{gerund}': grammar.toGerund(verb),
            '{infinitive}': grammar.toInfinitive(verb2),
            '{subject_pronoun}': grammar.getSubjectPronoun(name1),
            '{subject_pronoun_plural}': grammar.getSubjectPronoun(name1, true),
            '{possessive}': grammar.getPossessive(name1)
        };

        // Apply replacements
        let sentence = selectedTemplate;
        Object.keys(replacements).forEach(key => {
            sentence = sentence.replace(new RegExp(key, 'g'), replacements[key]);
        });

        // Add optional dialogue
        if (includeDialogue && Math.random() > 0.5) {
            const dialogues = [
                `"The time has come," ${name1} whispered`,
                `"Never again," vowed ${name1}`,
                `${name1} declared, "This ends now"`
            ];
            sentence = `${getRandom(dialogues)}. ${sentence}`;
        }

        // Clean up any empty spaces and ensure proper capitalization
        sentence = sentence.replace(/\s+/g, ' ').trim();
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

        // Ensure sentence ends with period
        if (!sentence.endsWith('.') && !sentence.endsWith('!') && !sentence.endsWith('?')) {
            sentence += '.';
        }

        return sentence;
    }
}

// Export to window
window.nameGen = new SupermandoNameGenerator();

// Usage examples (commented out):
// const name = nameGen.generate('medieval');
// const elfName = nameGen.generate('fantasy_elf');
// const multipleNames = nameGen.generateMultiple('viking', 10);
// const allCategories = nameGen.listCategories();
// const samplesFromAll = nameGen.generateFromAllCategories();