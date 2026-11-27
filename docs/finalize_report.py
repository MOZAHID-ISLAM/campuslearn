"""Fill the last placeholders in the CSE 3206 Lab 6 report (rev1 docx)
with the verified GitHub facts, and save the final report.

Fills (all verified live on 2026-11-27):
  - demo link: https://mozahid-islam.github.io/campuslearn/ (Pages built, HTTP 200)
  - PR #6 (feature/readme-badges): merged after the README conflict was resolved
  - merge conflict: main added the demo link, the branch added the CI badge,
    both on the same README lines; fixed by keeping both (merge commit 604cac6)
"""
from docx import Document

SRC = "/home/hatch/workspace/your_files/Lab_6_Report_CSE3206_2203028_rev1.docx"
OUT = "/home/hatch/workspace/your_files/Lab_6_Report_CSE3206_2203028.docx"

DEMO_URL = "https://mozahid-islam.github.io/campuslearn/"
CONFLICT_NOTE = (
    "Merge conflict: main added the live demo link and the branch added the "
    "CI badge, both on the same lines in the README. I fixed it by keeping "
    "both changes and committed the merge."
)
PR6_OUTCOME = "Merged — the README conflict was resolved and the branch merged in."

doc = Document(SRC)

replaced = []
for p in doc.paragraphs:
    if p.text == "Live demo: [link to add once hosting is chosen]":
        p.runs[0].text = "Live demo: " + DEMO_URL
        replaced.append("demo link")
    elif p.text.startswith("Merge conflict: TO FILL IN"):
        p.runs[0].text = CONFLICT_NOTE
        replaced.append("conflict note")

for t in doc.tables:
    for row in t.rows:
        cells = row.cells
        if len(cells) == 4 and cells[0].text == "6" and cells[3].text == "TO FILL IN":
            cells[3].paragraphs[0].runs[0].text = PR6_OUTCOME
            replaced.append("PR6 outcome")

print("replaced:", replaced)
assert len(replaced) == 3, f"expected 3 replacements, got {replaced}"
doc.save(OUT)
print("saved", OUT)
