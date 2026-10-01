// Reports frozen under rules revision 1 store letter grades; the screen shows every grade on
// the 1-6 scale. Grades already on that scale pass through unchanged.
const LETTER_TO_SCALE: Readonly<Record<string, string>> = {
  "A+": "6",
  A: "5",
  "B+": "4+",
  B: "4",
  "C+": "3+",
  C: "3",
};

export function displayGrade(grade: string): string {
  return LETTER_TO_SCALE[grade] ?? grade;
}
