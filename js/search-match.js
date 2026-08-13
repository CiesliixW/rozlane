const SearchMatch = (() => {
  function normalize(s) {
    return String(s)
      .replace(/ł/g, "l").replace(/Ł/g, "L")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();
  }

  // Optimal string alignment distance: Levenshtein plus adjacent-swap
  // transpositions counted as a single edit, since "blue"/"bleu" style
  // typos are common and shouldn't cost two substitutions.
  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
        }
      }
    }
    return dp[a.length][b.length];
  }

  // Plain substring match first; small typo tolerance (scaled to word
  // length) on top of it so e.g. "sauvige" still finds "Sauvage".
  function wordMatches(word, haystackWords, haystack) {
    if (haystack.includes(word)) return true;
    const tolerance = word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2;
    if (!tolerance) return false;
    return haystackWords.some((hWord) => levenshtein(word, hWord) <= tolerance);
  }

  function matches(product, query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const haystack = normalize(`${product.h} ${product.n}`);
    const haystackWords = haystack.split(/\s+/);
    return words.every((word) => wordMatches(word, haystackWords, haystack));
  }

  return { normalize, matches };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SearchMatch;
}
