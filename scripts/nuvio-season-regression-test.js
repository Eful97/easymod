"use strict";

const assert = require("node:assert/strict");
const {
  extractImdbId,
  resolveRequestedEpisodeCandidates,
  shouldRetrySeasonMappingWithImdb,
  toAbsoluteEpisodeFromSeasonCounts
} = require("../src/anime_episode_candidates.js");
const animeSaturn = require("../src/animesaturn/index.js");
const animeUnity = require("../src/animeunity/index.js");
const animeWorld = require("../src/animeworld/index.js");
const manifest = require("../manifest.json");

function supportsNuvioTvType(supportedTypes, requestedType) {
  const targetTypes =
    String(requestedType || "").toLowerCase() === "series"
      ? ["series", "tv", "anime"]
      : [String(requestedType || "").toLowerCase()];
  return supportedTypes.map((type) => String(type || "").toLowerCase()).some((type) => targetTypes.includes(type));
}

function normalizeNuvioMobileType(type) {
  const normalized = String(type || "").toLowerCase();
  return ["series", "show", "other"].includes(normalized) ? "tv" : normalized;
}

function supportsNuvioMobileType(supportedTypes, requestedType) {
  const normalizedType = normalizeNuvioMobileType(requestedType);
  return supportedTypes.map(normalizeNuvioMobileType).includes(normalizedType);
}

async function run() {
  const attackOnTitanSeasonCounts = [
    { season_number: 1, episode_count: 25 },
    { season_number: 2, episode_count: 12 }
  ];
  const mappingPayload = {
    requested: { season: 2, episode: 1 },
    kitsu: { episode: 1 },
    mappings: { ids: { tmdb: "1429" } }
  };
  const tmdbMappingPayload = {
    requested: { provider: "tmdb", externalId: "1429", season: 2, episode: 1 },
    mappings: { ids: { imdb: "tt2560140", tmdb: "1429" } }
  };
  const jujutsuSearchHtml = `
    <div class="film-list">
      <a href="/play/jujutsu-kaisen.8nMP2" data-jtitle="Jujutsu Kaisen">Jujutsu Kaisen</a>
      <a href="/play/jujutsu-kaisen-ita.oV4fH" data-jtitle="Jujutsu Kaisen ITA">Jujutsu Kaisen (ITA)</a>
      <a href="/play/jujutsu-kaisen-2.M-Oiw" data-jtitle="Jujutsu Kaisen 2">Jujutsu Kaisen 2</a>
      <a href="/play/jujutsu-kaisen-0-movie.r6W2i" data-jtitle="Jujutsu Kaisen 0 Movie">Jujutsu Kaisen 0 Movie</a>
    </div>
  `;
  const jujutsuResults = animeWorld._private.parseAnimeWorldSearchResults(jujutsuSearchHtml);
  const demonSlayerSearchHtml = `
    <div class="film-list">
      <a href="/play/demon-slayer-kimetsu-no-yaiba.LrOb0"></a>
      <a href="/play/demon-slayer-kimetsu-no-yaiba.LrOb0" data-jtitle="Kimetsu no Yaiba">Demon Slayer: Kimetsu no Yaiba</a>
      <a href="/play/demon-slayer-kimetsu-no-yaiba-2.pbncD" data-jtitle="Kimetsu no Yaiba: Mugen Ressha-hen">Demon Slayer: Kimetsu no Yaiba Mugen Train Arc TV</a>
      <a href="/play/demon-slayer-kimetsu-no-yaiba-entertainment-district-arc.-HwgD" data-jtitle="Kimetsu no Yaiba: Yuukaku-hen">Demon Slayer: Kimetsu no Yaiba Entertainment District Arc</a>
      <a href="/play/demon-slayer-kimetsu-no-yaiba-ita.3z-5e" data-jtitle="Kimetsu no Yaiba">Demon Slayer: Kimetsu no Yaiba</a>
    </div>
  `;
  const demonSlayerResults = animeWorld._private.parseAnimeWorldSearchResults(
    demonSlayerSearchHtml
  );
  const jujutsuUnityRecords = [
    {
      id: 2791,
      title: null,
      title_eng: "Jujutsu Kaisen",
      slug: "jujutsu-kaisen",
      type: "TV",
      episodes_count: 24
    },
    {
      id: 3896,
      title: null,
      title_eng: "Jujutsu Kaisen (ITA)",
      slug: "jujutsu-kaisen-ita",
      type: "TV",
      episodes_count: 24
    },
    {
      id: 4197,
      title: null,
      title_eng: "Jujutsu Kaisen 2",
      slug: "jujutsu-kaisen-2",
      type: "TV",
      episodes_count: 23
    },
    {
      id: 4786,
      title: null,
      title_eng: "Jujutsu Kaisen 2 (ITA)",
      slug: "jujutsu-kaisen-2-ita",
      type: "TV",
      episodes_count: 23
    }
  ];
  const demonSlayerUnityRecords = [
    {
      id: 2549,
      title: "Demon Slayer: Kimetsu no Yaiba",
      title_eng: "Demon Slayer",
      slug: "demon-slayer",
      type: "TV",
      episodes_count: 26
    },
    {
      id: 2550,
      title: "Demon Slayer: Kimetsu no Yaiba (ITA)",
      title_eng: "Demon Slayer (ITA)",
      slug: "demon-slayer-ita",
      type: "TV",
      episodes_count: 26
    },
    {
      id: 3337,
      title: "Kimetsu no Yaiba: Yuukaku-hen",
      title_eng: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc",
      slug: "demon-slayer-kimetsu-no-yaiba-entertainment-district-arc",
      type: "TV",
      episodes_count: 11
    }
  ];
  const demonSlayerUnityArcOnlyRecords = [
    {
      id: 3337,
      title: "Kimetsu no Yaiba: Yuukaku-hen",
      title_eng: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc",
      slug: "demon-slayer-kimetsu-no-yaiba-entertainment-district-arc",
      type: "TV",
      episodes_count: 11
    },
    {
      id: 3257,
      title: "Kimetsu no Yaiba: Mugen Ressha-hen (TV)",
      title_eng: "Demon Slayer: Kimetsu no Yaiba Mugen Train Arc",
      slug: "demon-slayer-kimetsu-no-yaiba-mugen-train-arc",
      type: "TV",
      episodes_count: 7
    }
  ];
  const jujutsuSaturnRecords = [
    {
      name: "Jujutsu Kaisen",
      link: "Jujutsu-Kaisen-aaaaaaaa",
      release: "03 Ottobre 2020",
      state: "1"
    },
    {
      name: "Jujutsu Kaisen 2",
      link: "Jujutsu-Kaisen-2-aaaaa",
      release: "06 Luglio 2023",
      state: "1"
    },
    {
      name: "Jujutsu Kaisen (ITA)",
      link: "Jujutsu-Kaisen-ITA-aaaa",
      release: "03 Ottobre 2020",
      state: "1"
    },
    {
      name: "Jujutsu Kaisen 2 (ITA)",
      link: "Jujutsu-Kaisen-2-ITA-a",
      release: "06 Luglio 2023",
      state: "1"
    }
  ];
  const demonSlayerSaturnRecords = [
    {
      name: "Demon Slayer: Kimetsu no Yaiba",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-aaa",
      release: "06 Aprile 2019",
      state: "1"
    },
    {
      name: "Demon Slayer Movie: Mugen Train",
      link: "Demon-Slayer-Movie-Mugen-Train-a",
      release: "16 Ottobre 2020",
      state: "1"
    },
    {
      name: "Demon Slayer: Kimetsu no Yaiba (ITA)",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-ITA-a",
      release: "06 Aprile 2019",
      state: "1"
    },
    {
      name: "Demon Slayer: Kimetsu no Yaiba Entertainment District Arc",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-Entertainment-District-Arc-a",
      release: "05 Dicembre 2021",
      state: "1"
    }
  ];
  const demonSlayerSaturnSeasonTwoRecords = [
    {
      name: "Demon Slayer: Kimetsu no Yaiba Mugen Train Arc TV",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-Mugen-Train-Arc-TV-a",
      release: "10 Ottobre 2021",
      state: "1"
    },
    {
      name: "Demon Slayer: Kimetsu no Yaiba",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-aaa",
      release: "06 Aprile 2019",
      state: "1"
    },
    {
      name: "Demon Slayer: Kimetsu no Yaiba Infinity Castle",
      link: "Demon-Slayer-Kimetsu-no-Yaiba-Infinity-Castle-a",
      release: "18 Luglio 2025",
      state: "1"
    }
  ];

  assert.equal(
    toAbsoluteEpisodeFromSeasonCounts(attackOnTitanSeasonCounts, 2, 1),
    26
  );

  assert.deepEqual(
    await resolveRequestedEpisodeCandidates(mappingPayload, 1, null, {
      seasonCounts: attackOnTitanSeasonCounts
    }),
    [26, 1]
  );

  assert.deepEqual(
    await resolveRequestedEpisodeCandidates(
      mappingPayload,
      1,
      { requestedSeason: 2, absoluteEpisode: 26 },
      { seasonCounts: [] }
    ),
    [26, 1]
  );

  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  try {
    global.setTimeout = undefined;
    global.clearTimeout = undefined;
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        seasons: attackOnTitanSeasonCounts
      })
    });

    assert.deepEqual(
      await resolveRequestedEpisodeCandidates(
        {
          requested: { season: 2, episode: 1 },
          mappings: { ids: { tmdb: "900001429" } }
        },
        1
      ),
      [26, 1]
    );
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }

  assert.equal(extractImdbId(tmdbMappingPayload), "tt2560140");
  assert.equal(
    shouldRetrySeasonMappingWithImdb(
      { provider: "tmdb", externalId: "1429", season: 2, episode: 1 },
      tmdbMappingPayload
    ),
    true
  );
  assert.equal(
    shouldRetrySeasonMappingWithImdb(
      { provider: "imdb", externalId: "tt2560140", season: 2, episode: 1 },
      tmdbMappingPayload
    ),
    false
  );

  assert.deepEqual(
    animeWorld._private.selectAnimeWorldSearchPaths(jujutsuResults, ["Jujutsu Kaisen"], 1),
    ["/play/jujutsu-kaisen.8nMP2", "/play/jujutsu-kaisen-ita.oV4fH"]
  );
  assert.deepEqual(
    animeWorld._private.selectAnimeWorldSearchPaths(jujutsuResults, ["Jujutsu Kaisen"], 2),
    ["/play/jujutsu-kaisen-2.M-Oiw"]
  );
  assert.deepEqual(
    animeWorld._private.selectAnimeWorldSearchPaths(
      demonSlayerResults,
      ["Demon Slayer: Kimetsu no Yaiba"],
      1
    ),
    [
      "/play/demon-slayer-kimetsu-no-yaiba.LrOb0",
      "/play/demon-slayer-kimetsu-no-yaiba-ita.3z-5e"
    ]
  );
  assert.deepEqual(
    animeWorld._private.selectAnimeWorldSearchPaths(
      demonSlayerResults,
      ["Demon Slayer: Kimetsu no Yaiba"],
      2
    ),
    ["/play/demon-slayer-kimetsu-no-yaiba-2.pbncD"]
  );
  assert.deepEqual(
    animeUnity._private.selectAnimeUnitySearchPaths(jujutsuUnityRecords, ["Jujutsu Kaisen"], 1),
    ["/anime/2791-jujutsu-kaisen", "/anime/3896-jujutsu-kaisen-ita"]
  );
  assert.deepEqual(
    animeUnity._private.selectAnimeUnitySearchPaths(jujutsuUnityRecords, ["Jujutsu Kaisen"], 2),
    ["/anime/4197-jujutsu-kaisen-2", "/anime/4786-jujutsu-kaisen-2-ita"]
  );
  assert.deepEqual(
    animeUnity._private.selectAnimeUnitySearchPaths(
      demonSlayerUnityRecords,
      ["Demon Slayer: Kimetsu no Yaiba"],
      1
    ),
    ["/anime/2549-demon-slayer", "/anime/2550-demon-slayer-ita"]
  );
  assert.deepEqual(
    animeUnity._private.selectAnimeUnitySearchPaths(
      demonSlayerUnityArcOnlyRecords,
      ["Demon Slayer: Kimetsu no Yaiba"],
      1
    ),
    []
  );
  assert.deepEqual(
    animeSaturn._private.selectAnimeSaturnSearchPaths(jujutsuSaturnRecords, ["Jujutsu Kaisen"], 1),
    ["/anime/Jujutsu-Kaisen-aaaaaaaa", "/anime/Jujutsu-Kaisen-ITA-aaaa"]
  );
  assert.deepEqual(
    animeSaturn._private.selectAnimeSaturnSearchPaths(jujutsuSaturnRecords, ["Jujutsu Kaisen"], 2),
    ["/anime/Jujutsu-Kaisen-2-aaaaa", "/anime/Jujutsu-Kaisen-2-ITA-a"]
  );
  assert.deepEqual(
    animeSaturn._private.selectAnimeSaturnSearchPaths(
      demonSlayerSaturnRecords,
      ["Demon Slayer: Kimetsu no Yaiba"],
      1
    ),
    [
      "/anime/Demon-Slayer-Kimetsu-no-Yaiba-aaa",
      "/anime/Demon-Slayer-Kimetsu-no-Yaiba-ITA-a"
    ]
  );
  assert.deepEqual(
    animeSaturn._private.selectAnimeSaturnSearchPaths(
      demonSlayerSaturnSeasonTwoRecords,
      ["Demon Slayer: Kimetsu no Yaiba Mugen Train Arc", "Mugen Train Arc"],
      2
    ),
    ["/anime/Demon-Slayer-Kimetsu-no-Yaiba-Mugen-Train-Arc-TV-a"]
  );

  const animeScrapers = manifest.scrapers.filter((scraper) =>
    ["AnimeUnity", "AnimeWorld", "AnimeSaturn"].includes(scraper.name)
  );
  assert.equal(animeScrapers.length, 3);

  for (const scraper of animeScrapers) {
    assert.equal(scraper.enabled, true, `${scraper.name} should be enabled in manifest`);
    assert.equal(
      supportsNuvioTvType(scraper.supportedTypes, "series"),
      true,
      `${scraper.name} should be selectable by NuvioTV for TMDB series`
    );
    assert.equal(
      supportsNuvioMobileType(scraper.supportedTypes, "series"),
      true,
      `${scraper.name} should be selectable by NuvioMobile for TMDB series`
    );
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
