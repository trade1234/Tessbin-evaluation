export const ratingLabels = [
  "Excellent",
  "Very good",
  "Good",
  "Needs improvement",
  "Not applicable"
];

export const ratingValueMap = {
  Excellent: 5,
  "Very good": 4,
  Good: 3,
  "Needs improvement": 2,
  "Not applicable": 0
};

export const sections = [
  {
    key: "content",
    title: "Content",
    questions: [
      { key: "objectiveOfTraining", label: "Objective of the training" },
      { key: "practicalToNeeds", label: "Practice to my needs and interest" },
      { key: "wellOrganized", label: "Well organized" },
      { key: "visualAids", label: "Useful visual aids and handouts" }
    ]
  },
  {
    key: "presentation",
    title: "Presentation",
    questions: [
      { key: "instructorKnowledge", label: "Instructor's knowledge" },
      { key: "presentationStyle", label: "Instructor's presentation style" },
      { key: "coveredClearly", label: "Instructor covered the material clearly" },
      { key: "respondedToQuestions", label: "Instructor responded well to questions" },
      { key: "theoryToPractice", label: "Instructor's ability to relate theory to practice" }
    ]
  },
  {
    key: "facilities",
    title: "Training Facilities",
    questions: [
      { key: "roomPreparation", label: "Training room preparation" },
      { key: "location", label: "Location of the training" },
      { key: "duration", label: "Duration of the training" }
    ]
  }
];

export const sourceOptions = ["Facebook", "Telegram", "TikTok", "LinkedIn", "Other"];
export const overallOptions = ["Excellent", "Very good", "Good", "Fair", "Poor"];

