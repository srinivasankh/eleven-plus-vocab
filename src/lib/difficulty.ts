import { VocabEntry } from "@/lib/types";

export type Difficulty = "easy" | "medium" | "hard";

// Words classified by real-world familiarity for 10–12 year olds.
// Easy: everyday words kids this age already use or understand.
// Hard: advanced vocabulary that stretches their knowledge.
// Everything else defaults to medium.

const easyIds = new Set([
  2, 3, 9, 21, 26, 27, 30, 32, 34, 40, 43, 44, 46, 47, 48, 49, 50, 52, 54,
  57, 61, 62, 63, 65, 71, 74, 79, 82, 89, 103, 116, 117, 118, 121, 129, 132,
  137, 145, 146, 155, 156, 157, 158, 159, 160, 163, 164, 166, 167, 169, 174,
  177, 182, 184, 187, 194, 196, 202, 216, 223, 224, 227, 233, 239, 242, 248,
  249, 250, 253, 256, 257, 261, 262, 264, 269, 270, 271, 272, 274, 277, 279,
  282, 288, 290, 293, 294, 299, 300, 303, 305, 306, 307, 308, 310, 311, 313,
  315, 323, 324, 327, 330, 332, 334, 339, 341, 342, 347, 349, 350, 351, 352,
  353, 354, 355, 356, 358, 359, 363, 364, 368, 369, 370, 374, 376, 378, 379,
  381, 382, 383, 385, 386, 389, 391, 392, 393, 395, 396, 397, 398, 399, 400,
  401, 402, 403, 405, 406, 407, 409, 410, 412, 413, 415, 416, 417, 418, 420,
  421, 422, 423, 427, 428, 430, 432, 433, 434, 436, 437, 438, 445, 448, 449,
  450, 454, 455, 457, 460, 467, 471, 481, 489, 501, 504, 509, 511, 518, 519,
  520, 522, 523, 531, 537, 540, 546, 547, 551, 552, 554,
]);

const hardIds = new Set([
  1, 4, 5, 8, 10, 13, 14, 15, 16, 17, 18, 20, 22, 23, 24, 25, 28, 29, 31,
  36, 38, 39, 41, 53, 59, 66, 68, 69, 72, 73, 76, 80, 81, 83, 84, 85, 88,
  90, 92, 94, 95, 96, 97, 98, 100, 101, 104, 105, 106, 107, 108, 110, 112,
  113, 115, 119, 120, 122, 124, 126, 127, 128, 130, 131, 133, 134, 135, 136,
  138, 140, 141, 152, 154, 162, 165, 168, 170, 171, 175, 178, 179, 186, 188,
  192, 193, 197, 198, 199, 200, 201, 203, 205, 209, 210, 212, 213, 214, 217,
  218, 219, 220, 222, 225, 226, 228, 229, 231, 232, 236, 238, 240, 244, 245,
  247, 254, 255, 258, 259, 260, 266, 268, 276, 278, 285, 289, 291, 295, 296,
  298, 301, 309, 316, 318, 325, 326, 328, 331, 333, 337, 344, 345, 348, 365,
  367, 380, 384, 390, 439, 440, 441, 451, 452, 462, 463, 464, 465, 468, 469,
  470, 472, 473, 474, 477, 478, 480, 488, 491, 494, 498, 499, 500, 506, 515,
  539, 550, 553, 559, 560,
]);

export function getDifficulty(id: number): Difficulty {
  if (easyIds.has(id)) return "easy";
  if (hardIds.has(id)) return "hard";
  return "medium";
}

export function filterByDifficulty(
  entries: VocabEntry[],
  difficulty: Difficulty,
): VocabEntry[] {
  return entries.filter((entry) => getDifficulty(entry.id) === difficulty);
}

export function countByDifficulty(
  entries: VocabEntry[],
): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const entry of entries) {
    counts[getDifficulty(entry.id)] += 1;
  }
  return counts;
}
