/* Cross-form duplicate questions: duplicate qid -> canonical qid.
   ETS's 2024 practice book (form GR1775, exam id 'ets2024') reprints 70
   GR1777 questions with the same stem, choices, choice order and answer.
   Each pair is one question, so practice keeps only the canonical id:
   js/bank.js leaves a duplicate out of every practice surface, lets a sat
   duplicate graduate its canonical into the default pool, and files
   mistake-book entries under the canonical id. The duplicate id stays in its
   exam, so the intact sitting and its review replay verbatim.
   tools/build-ets-exams.js checks every pair against the built bank (same
   answer, canonical is the closest question of its form) and fails the
   build on a mismatch. Ids only: no exam content lives here. */
window.PGRE = window.PGRE || {};
PGRE.DUPLICATE_OF = {
  "ets24-1": "gr1777-2", "ets24-2": "gr1777-3", "ets24-3": "gr1777-4", "ets24-4": "gr1777-5", "ets24-5": "gr1777-6",
  "ets24-6": "gr1777-7", "ets24-7": "gr1777-8", "ets24-8": "gr1777-10", "ets24-9": "gr1777-11", "ets24-10": "gr1777-12",
  "ets24-11": "gr1777-13", "ets24-12": "gr1777-14", "ets24-13": "gr1777-15", "ets24-14": "gr1777-17", "ets24-15": "gr1777-18",
  "ets24-16": "gr1777-19", "ets24-17": "gr1777-20", "ets24-18": "gr1777-21", "ets24-19": "gr1777-22", "ets24-20": "gr1777-23",
  "ets24-21": "gr1777-24", "ets24-22": "gr1777-25", "ets24-23": "gr1777-26", "ets24-24": "gr1777-28", "ets24-25": "gr1777-29",
  "ets24-26": "gr1777-30", "ets24-27": "gr1777-31", "ets24-28": "gr1777-32", "ets24-29": "gr1777-35", "ets24-30": "gr1777-36",
  "ets24-31": "gr1777-37", "ets24-32": "gr1777-38", "ets24-33": "gr1777-39", "ets24-34": "gr1777-40", "ets24-35": "gr1777-41",
  "ets24-36": "gr1777-42", "ets24-37": "gr1777-44", "ets24-38": "gr1777-45", "ets24-39": "gr1777-46", "ets24-40": "gr1777-47",
  "ets24-41": "gr1777-48", "ets24-42": "gr1777-51", "ets24-43": "gr1777-52", "ets24-44": "gr1777-54", "ets24-45": "gr1777-55",
  "ets24-46": "gr1777-56", "ets24-47": "gr1777-57", "ets24-48": "gr1777-59", "ets24-49": "gr1777-62", "ets24-50": "gr1777-63",
  "ets24-51": "gr1777-65", "ets24-52": "gr1777-67", "ets24-53": "gr1777-69", "ets24-54": "gr1777-70", "ets24-55": "gr1777-71",
  "ets24-56": "gr1777-72", "ets24-57": "gr1777-73", "ets24-58": "gr1777-74", "ets24-59": "gr1777-76", "ets24-60": "gr1777-77",
  "ets24-61": "gr1777-78", "ets24-62": "gr1777-79", "ets24-63": "gr1777-82", "ets24-64": "gr1777-84", "ets24-65": "gr1777-85",
  "ets24-66": "gr1777-86", "ets24-67": "gr1777-88", "ets24-68": "gr1777-89", "ets24-69": "gr1777-90", "ets24-70": "gr1777-91"
};
