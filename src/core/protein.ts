/**
 * Static protein reference — NOT a nutrition feature, just ready-made options so you
 * can hit your protein on a training day. ~2 g/kg for muscle retention on the taper.
 * Whole-food, kosher-friendly. No tracking, no logging — just ideas.
 */
export function proteinTargetG(bodyweightKg = 78): number {
  return Math.round(bodyweightKg * 2);
}

export interface ProteinDose {
  grams: number;
  options: string[]; // each option is a combo that lands ~at the dose
}

/**
 * Ready combos per dose. KOSHER: no option mixes meat with dairy. Fish, eggs and nuts
 * are pareve (fine with dairy). "Meat" options stay dairy-free; "dairy" options use
 * fish/eggs for the rest. Each line is a daily total spread across meals.
 */
export const PROTEIN_DOSES: ProteinDose[] = [
  {
    grams: 120,
    options: [
      "Dairy: 250g Greek yogurt + 200g cottage cheese + 1 scoop whey",
      "Dairy + fish: 180g salmon + 200g cottage cheese + 2 eggs",
      "Meat (no dairy): 300g chicken breast + 3 eggs",
      "Meat (no dairy): 250g lean beef + 3 eggs + 30g almonds",
    ],
  },
  {
    grams: 140,
    options: [
      "Dairy: 300g Greek yogurt + 250g cottage cheese + 2 scoops whey",
      "Dairy + fish: 200g tuna + 250g cottage cheese + 1 scoop whey",
      "Meat (no dairy): 350g chicken breast + 4 eggs",
      "Meat (no dairy): 300g lean beef + 3 eggs + 30g almonds",
    ],
  },
  {
    grams: 160,
    options: [
      "Dairy: 300g Greek yogurt + 250g cottage cheese + 2 scoops whey + 2 eggs",
      "Dairy + fish: 220g salmon + 250g cottage cheese + 2 scoops whey",
      "Meat (no dairy): 400g chicken breast + 4 eggs",
      "Meat (no dairy): 350g lean beef + 4 eggs + 30g almonds",
    ],
  },
  {
    grams: 180,
    options: [
      "Dairy: 350g Greek yogurt + 300g cottage cheese + 2 scoops whey + 2 eggs",
      "Dairy + fish: 250g salmon + 250g cottage cheese + 2 scoops whey + 2 eggs",
      "Meat (no dairy): 450g chicken breast + 4 eggs + 30g almonds",
      "Meat (no dairy): 400g lean beef + 4 eggs + 40g almonds",
    ],
  },
];

/** Pick the dose bucket closest to a target. */
export function proteinOptionsFor(targetG: number): ProteinDose {
  return PROTEIN_DOSES.reduce((best, d) => (Math.abs(d.grams - targetG) < Math.abs(best.grams - targetG) ? d : best), PROTEIN_DOSES[0]!);
}
