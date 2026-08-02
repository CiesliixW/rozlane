const SIZES = ["2 ml", "5 ml", "10 ml", "30 ml"];

const PRICE_TABLE = {
  designer: [17.99, 39.99, 74.99, 199.00],
  premium: [24.99, 54.99, 99.00, 269.00],
  nisza: [34.99, 79.99, 149.00, 399.00],
  ultra: [49.99, 109.00, 199.00, 549.00],
};

const PRODUCTS = [
  { h: "Dior", n: "Sauvage Parfum", no: "bergamotka · sandałowiec · tonka", t: "designer", g: ["meskie"], best: 1, img: "images/sauvage.webp", r: 4.9, c: 412 },
  { h: "Versace", n: "Eros Parfum", no: "mięta · tonka · wanilia", t: "designer", g: ["meskie"], best: 1, img: "images/eros.webp", r: 4.8, c: 307 },
  { h: "Paco Rabanne", n: "1 Million Parfum", no: "skóra · kardamon · miód", t: "designer", g: ["meskie"], best: 1, img: "images/million.webp", r: 4.7, c: 288 },
  { h: "Paco Rabanne", n: "Invictus Parfum", no: "grejpfrut · morska nuta · drewno", t: "designer", g: ["meskie"], best: 0, img: "images/invictus.webp", r: 4.6, c: 154 },
  { h: "Emporio Armani", n: "Stronger With You Absolutely", no: "kawa · tytoń · wanilia", t: "designer", g: ["meskie"], best: 1, img: "images/swy.webp", r: 4.8, c: 263 },
  { h: "Tom Ford", n: "Ombré Leather", no: "skóra · szafran · jaśmin", t: "nisza", g: ["unisex"], best: 1, img: "images/ombre.webp", r: 4.9, c: 198 },
  { h: "Valentino", n: "Uomo Born in Roma Extradose", no: "pieprz · wetiwer · tonka", t: "premium", g: ["meskie"], best: 0, img: "images/roma_extra.webp", r: 4.7, c: 141 },
  { h: "Valentino", n: "Uomo Born in Roma Intense", no: "jałowiec · kakao · skóra", t: "designer", g: ["meskie"], best: 0, img: "images/roma_intense.webp", r: 4.6, c: 132 },
];
