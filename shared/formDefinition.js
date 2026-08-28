export const ratingLabels = [
  "Excellent",
  "Very Good",
  "Good",
  "Needs Improvement",
  "Not Applicable"
];

export const ratingValueMap = {
  Excellent: 5,
  "Very Good": 4,
  "Very good": 4,
  Good: 3,
  "Needs Improvement": 2,
  "Needs improvement": 2,
  "Not Applicable": 0,
  "Not applicable": 0
};

export const overallOptions = ["Excellent", "Very good", "Good", "Fair", "Poor"];
export const sourceOptions = ["Facebook", "Telegram", "TikTok", "LinkedIn", "Other"];

export const sections = [
  {
    key: "presentation",
    title: "Trainer Evaluation",
    questions: [
      { key: "trainerObjectiveClear", label: "Was the training objective clear and easy to understand?" },
      { key: "trainerUsefulForWork", label: "Was the training useful for your work?" },
      { key: "trainerWellOrganized", label: "Was the training well organized?" },
      { key: "trainerMaterialsHelpful", label: "Were the training materials (slides, handouts, visuals) helpful?" }
    ]
  }
];
