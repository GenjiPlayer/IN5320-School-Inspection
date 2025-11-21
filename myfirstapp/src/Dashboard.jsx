import { Button } from "@dhis2/ui";

/**
 * - The minimum standard for the seat-to-learner ratio is 1:1.
 * - The minimum standard for the textbook-to-learner ratio across all levels and subjects is 1:1.
 * - The minimum standard for learner-to-classroom ratio is <53:1.
 * - The minimum standard for learner-to-teacher ratio across all levels is <45:1.
 * - The minimum standard for learner-to-toilet ratio is <25:1.
 * - With a focus on gender equality, the education system also monitors the Gender Parity Index (GPI): the number of female learners divided by males and the number of female teachers divided by males.
 */

// We need to know the (binary) gender in order to measure gender equality.
const genders = { male: "male", female: "female" };

const data = {
  schools: [
    {
      id: "fXdsaj",
      name: "Boulder",

      classrooms: [{ id: "djskla" }],

      // Levels are for example "First grade", "Second grade", potentially "Algebra 1", etc.
      levels: [
        {
          id: "first_grade",
          name: "First grade",
          // What subjects are taught on this level
          subjects: [
            {
              id: "math",
              name: "Math",
              // Now two different subjects or levels share the same book.
              curriculumBooks: [{ id: "book_math" }],
              // What teachers are involved in this subject? Can be multiple teachers per subject. The id refers to the id of teachers (see further down).
              teachers: [{ id: "fklasø" }],
              // What learners are enrolled in this subject? Same as with teachers.
              learners: [{ id: "paoi21f" }],
            },
          ],
        },
      ],

      books: { book_math: { name: "Math for beginners", num: 17 } },

      teachers: [
        { id: "fklasø", name: "Abagail Freemantle", gender: genders.male },
      ],
      learners: [
        { id: "paoi21f", name: "Larry Underwood", gender: genders.female },
      ],

      numSeats: 35,
      numToilets: 16,
    },
  ],
};

/**
 * - The minimum standard for the seat-to-learner ratio is 1:1.
 * - The minimum standard for the textbook-to-learner ratio across all levels and subjects is 1:1.
 * - The minimum standard for learner-to-classroom ratio is <53:1.
 * - The minimum standard for learner-to-teacher ratio across all levels is <45:1.
 * - The minimum standard for learner-to-toilet ratio is <25:1.
 * - With a focus on gender equality, the education system also monitors the Gender Parity Index (GPI): the number of female learners divided by males and the number of female teachers divided by males.
 */

function getStats(school) {
  const numLearners = school.learners.length;

  const textbookToLearnerStats = {};
  for (const level of school.levels) {
    const levelStats = {};
    for (const subject of level.subjects) {
      const subjectStats = {};
      for (const bookRef of subject.curriculumBooks) {
        const book = school.books[bookRef.id];
        subjectStats[bookRef.id] = {
          numTextbooks: book.num,
          numLearners: subject.learners.length,
          ratio: book.num / subject.learners.length,
        };
      }
      levelStats[subject.id] = subjectStats;
    }
    textbookToLearnerStats[level.id] = levelStats;
  }

  const stats = {
    seatToLearnerRatio: school.numSeats / numLearners,
    textbookToLearner: textbookToLearnerStats,
    // etc...
  };
  return stats;
}

console.log(getStats(data.schools[0]));

export function Dashboard() {
  // Needed data. Get this from the database.
  // NOTE: There might be hierarchies in the data not accounted for here. I.e. grouping by classrooms, etc.
  let numSeats = 0;
  let numLearners = 0;
  let numTextbooks = 0;
  let numClassrooms = 0;
  let numTeachers = 0;
  let numToilets = 0;
  let numMaleLearners = 0;
  let numFemaleLearners = 0;
  let numMaleTeachers = 0;
  let numFemaleTeachers = 0;

  // Are there more than one classroom that we need to consider when visualizing learner-to-classroom ratio?
  // I.e.: if there are more than one classroom, how do we visualize them?
  return (
    <Button
      name="Primary button"
      primary
      large
      value="default"
    >
      Click me!
    </Button>
  );
  return <h1>Hello, World!</h1>;
}

/**
 * - Vi må designe (som i teknisk database design) hvordan vi setter opp dataene våre.
 *  - Datamodellen må muliggjøre å hente ut data som vi trenger til dashboardet (og kanskje andre ting?).
 *
 */
