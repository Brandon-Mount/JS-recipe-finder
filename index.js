/**
 * Recipe Finder (Node.js)
 * - Prompts user for ingredients
 * - Fetches recipes using TheMealDB API
 * - Intersects results across ingredients (recursion)
 * - Uses ES6 array methods heavily
 * - Demonstrates throwing/handling exceptions
 * - Outputs results to the terminal
 */

import axios from "axios";
import readline from "readline";

// ------------------------------
// Configuration
// ------------------------------
const API_BASE = "https://www.themealdb.com/api/json/v1/1";
const MAX_RESULTS_TO_SHOW = 10;

/**
 * Creates a readline interface for terminal input.
 * @returns {readline.Interface} readline interface
 */
function createInput() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Asks a question in the terminal and returns the user's response.
 * @param {readline.Interface} rl - readline interface
 * @param {string} question - prompt text
 * @returns {Promise<string>} user's input
 */
function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * Splits a comma-separated ingredient string into a clean array.
 * Uses ES6 array methods: split, map, filter.
 * @param {string} raw - raw input string
 * @returns {string[]} cleaned ingredient list
 */
function parseIngredients(raw) {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Validates ingredient input and throws an Error if invalid.
 * Demonstrates throwing exceptions.
 * @param {string[]} ingredients - list of ingredients
 */
function validateIngredients(ingredients) {
  if (!Array.isArray(ingredients)) {
    throw new Error("Ingredients must be an array.");
  }
  if (ingredients.length === 0) {
    throw new Error(
      "Please enter at least one ingredient (example: chicken, rice).",
    );
  }
  if (ingredients.length > 6) {
    throw new Error(
      "Please enter 6 ingredients or fewer (to keep results fast).",
    );
  }
  // Example extra rule: must be at least 2 characters long
  const tooShort = ingredients.find((i) => i.length < 2);
  if (tooShort) {
    throw new Error(
      `Ingredient "${tooShort}" is too short. Type a real ingredient name.`,
    );
  }
}

/**
 * Fetches meals that match ONE ingredient using TheMealDB.
 * Uses axios (third-party library).
 * @param {string} ingredient - ingredient name
 * @returns {Promise<Array<{idMeal: string, strMeal: string, strMealThumb: string}>>}
 */
async function fetchMealsByIngredient(ingredient) {
  const url = `${API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`;
  const response = await axios.get(url);
  // API returns { meals: [...] } or { meals: null }
  return response.data.meals ?? [];
}

/**
 * Builds a Map from meal ID to meal object for fast lookup.
 * Uses ES6: reduce.
 * @param {Array<{idMeal: string, strMeal: string, strMealThumb: string}>} meals
 * @returns {Map<string, {idMeal: string, strMeal: string, strMealThumb: string}>}
 */
function buildMealMap(meals) {
  return meals.reduce((map, meal) => {
    map.set(meal.idMeal, meal);
    return map;
  }, new Map());
}

/**
 * Intersects two meal lists by idMeal (keeps only meals in BOTH lists).
 * Uses ES6: filter + some.
 * @param {Array<{idMeal: string, strMeal: string}>} listA
 * @param {Array<{idMeal: string, strMeal: string}>} listB
 * @returns {Array<{idMeal: string, strMeal: string}>}
 */
function intersectTwoLists(listA, listB) {
  return listA.filter((mealA) =>
    listB.some((mealB) => mealB.idMeal === mealA.idMeal),
  );
}

/**
 * Recursively intersects multiple meal lists.
 * REQUIRED: Recursion (this is the recursion requirement).
 * @param {Array<Array<{idMeal: string, strMeal: string}>>} lists - array of meal arrays
 * @param {number} index - current index
 * @returns {Array<{idMeal: string, strMeal: string}>} intersection result
 */
function intersectAllRecursively(lists, index = 0) {
  // Base cases
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];
  if (index === lists.length - 1) return lists[index];

  // Recursive step: intersect current list with the intersection of the rest
  const restIntersection = intersectAllRecursively(lists, index + 1);
  return intersectTwoLists(lists[index], restIntersection);
}

/**
 * Prints meals to the terminal with simple formatting.
 * Uses ES6: sort, slice, map.
 * @param {Array<{idMeal: string, strMeal: string}>} meals
 */
function displayMeals(meals) {
  console.log("\n=== Recipe Finder Results ===");

  if (meals.length === 0) {
    console.log("No matching recipes found for those ingredients.\n");
    return;
  }

  // Sort alphabetically and show the first MAX_RESULTS_TO_SHOW
  const shown = meals
    .slice()
    .sort((a, b) => a.strMeal.localeCompare(b.strMeal))
    .slice(0, MAX_RESULTS_TO_SHOW);

  shown.map((m, idx) => {
    console.log(`${idx + 1}. ${m.strMeal} (ID: ${m.idMeal})`);
    return m;
  });

  if (meals.length > MAX_RESULTS_TO_SHOW) {
    console.log(`...and ${meals.length - MAX_RESULTS_TO_SHOW} more\n`);
  } else {
    console.log("");
  }
}

/**
 * Summarizes which ingredients were used and basic stats.
 * Uses ES6: every, some, reduce.
 * @param {string[]} ingredients
 * @param {Array<{idMeal: string, strMeal: string}>} meals
 */
function printSummary(ingredients, meals) {
  const hasManyIngredients = ingredients.length >= 3;
  const hasAnyResults = meals.length > 0;

  const totalNameChars = meals.reduce(
    (sum, meal) => sum + meal.strMeal.length,
    0,
  );

  console.log("=== Summary ===");
  console.log(`Ingredients: ${ingredients.join(", ")}`);
  console.log(`Ingredient count: ${ingredients.length}`);
  console.log(`Found recipes: ${meals.length}`);
  console.log(`Total recipe name characters: ${totalNameChars}`);
  console.log(`Used 3+ ingredients? ${hasManyIngredients ? "Yes" : "No"}`);
  console.log(`Any results? ${hasAnyResults ? "Yes" : "No"}`);
  console.log("");
}

/**
 * Main program runner.
 * Demonstrates exception handling with try/catch.
 */
async function main() {
  const rl = createInput();

  try {
    console.log("=== Recipe Finder (JavaScript / Node.js) ===");
    console.log("Type ingredients separated by commas.");
    console.log("Example: chicken, rice, cheese\n");

    const input = await ask(rl, "Enter ingredients: ");
    const ingredients = parseIngredients(input);

    // REQUIRED: Throwing exceptions (validateIngredients throws)
    validateIngredients(ingredients);

    // Fetch meals per ingredient (async)
    console.log("\nSearching recipes...");
    const mealLists = [];

    for (const ing of ingredients) {
      const meals = await fetchMealsByIngredient(ing);
      mealLists.push(meals);
      console.log(`- Found ${meals.length} recipes that include "${ing}"`);
    }

    // REQUIRED: Recursion (intersectAllRecursively)
    const intersection = intersectAllRecursively(mealLists);

    // Quick “best effort” dedupe (sometimes APIs repeat)
    // Uses ES6: reduce + Map
    const uniqueMap = buildMealMap(intersection);
    const uniqueMeals = Array.from(uniqueMap.values());

    // Display + summary
    displayMeals(uniqueMeals);
    printSummary(ingredients, uniqueMeals);

    // Optional extra: prompt to search again (uses conditionals)
    const again = (await ask(rl, "Search again? (y/n): ")).trim().toLowerCase();
    if (again === "y" || again === "yes") {
      console.log("\n---------------------------------\n");
      await main(); // recursion again (optional), re-run
    } else {
      console.log("\nDone. Goodbye!");
    }
  } catch (err) {
    // REQUIRED: Handling exceptions
    console.log("\n⚠️  Something went wrong:");
    console.log(err instanceof Error ? err.message : String(err));
    console.log("\nTry again with a valid ingredient list.\n");
  } finally {
    rl.close();
  }
}

// Run the program
main();
