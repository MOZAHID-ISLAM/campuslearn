"""Draw the UML class diagram for CampusLearn (docs/uml_class_diagram.png).

Layout: each column is a stack of boxes whose height comes from its own
lines. Arrows are drawn FIRST, then the boxes on top, so a long arrow that
passes behind a middle box is hidden by that box instead of crossing it.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

TITLE_H = 3.0
LINE_H = 1.3
PAD = 0.8
BOX_W = 22
GAP = 3.0
TOP = 63.0

fig, ax = plt.subplots(figsize=(16, 9.5))
ax.set_xlim(0, 100)
ax.set_ylim(0, 66)
ax.axis("off")

ax.text(50, 65.0, "CampusLearn — UML Class Diagram", ha="center", fontsize=14, fontweight="bold")

# --- geometry first (no drawing yet) -----------------------------------------
specs = {
    "AppUI": (2, ["store", "renderAll()", "showTab(tab)", "openQuiz(id)", "saveForm()"],
              "AppUI  <<Observer>>"),
    "CourseFactory": (2, ["createCourse()", "createLesson()", "createStudent()", "createQuiz()"],
                      "CourseFactory  <<Factory>>"),
    "Student": (2, ["id, name, email"], "Student"),
    "Enrollment": (2, ["id, studentId, courseId", "enrolledAt", "completedLessonIds[]"], "Enrollment"),
    "Store": (28, ["data, listeners, adapter", "getStore()", "addCourse() / enroll()",
                   "submitQuiz() / progress()", "subscribe() / notify()", "save() / load()"],
              "CampusLearnStore  <<Singleton>>"),
    "Course": (28, ["id, title, teacher", "description", "capacity, createdAt"], "Course"),
    "Lesson": (28, ["id, courseId, title", "content, order"], "Lesson"),
    "Quiz": (28, ["id, courseId, title", "grading, passMark", "questions[]"], "Quiz"),
    "StorageAdapter": (54, ["save(data)", "load() : data"], "<<interface>> StorageAdapter"),
    "LocalStorageAdapter": (54, ["key", "save(data)", "load() : data"], "LocalStorageAdapter"),
    "MemoryAdapter": (54, ["saved", "save(data)", "load() : data"], "MemoryAdapter"),
    "PercentStrategy": (78, ["score() -> 0..100"], "PercentStrategy"),
    "PassFailStrategy": (78, ["score() -> pass / fail"], "PassFailStrategy"),
    "GradeStrategy": (78, ["score(score, total,", "  passMark)"], "<<interface>> GradeStrategy"),
}
columns = [
    ["AppUI", "CourseFactory", "Student", "Enrollment"],
    ["Store", "Course", "Lesson", "Quiz"],
    ["StorageAdapter", "LocalStorageAdapter", "MemoryAdapter"],
    ["PercentStrategy", "PassFailStrategy", "GradeStrategy"],
]
geom = {}  # name -> (x, top, h)
for col in columns:
    y = TOP
    for name in col:
        x, lines, _ = specs[name]
        h = TITLE_H + len(lines) * LINE_H + PAD
        geom[name] = (x, y, h)
        y = y - h - GAP


def right(name):
    x, top, h = geom[name]
    return (x + BOX_W, top - h / 2)


def left(name):
    x, top, h = geom[name]
    return (x, top - h / 2)


def top_c(name, dx=0):
    x, top, h = geom[name]
    return (x + BOX_W / 2 + dx, top)


def bottom_c(name, dx=0):
    x, top, h = geom[name]
    return (x + BOX_W / 2 + dx, top - h)


def arrow(p1, p2, label="", style="-", color="#334155", lx=None, ly=None):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle="-|>",
                 mutation_scale=12, lw=1.3, color=color,
                 linestyle=style, shrinkA=1, shrinkB=1, zorder=1))
    if label:
        mx = p1[0] + (p2[0] - p1[0]) / 2 if lx is None else lx
        my = p1[1] + (p2[1] - p1[1]) / 2 + 1.2 if ly is None else ly
        ax.text(mx, my, label, ha="center", va="bottom", fontsize=8.5, color=color,
                bbox=dict(fc="white", ec="none", pad=1), zorder=3)


# --- arrows (drawn first, boxes cover the parts that pass behind them) -------
arrow((24, 58.5), (28, 58.5), "uses + subscribes", color="#14532d")
arrow((50, 58.5), (54, 58.5), "saves through")
arrow(bottom_c("Store"), top_c("Course"), "holds 0..*")
arrow((28, 47.0), (24, 47.0), "uses")
arrow(right("CourseFactory"), left("Course"), "creates")
arrow(top_c("LocalStorageAdapter", dx=-5), bottom_c("StorageAdapter", dx=-5),
      style=(0, (4, 3)), color="#64748b")
arrow(top_c("MemoryAdapter", dx=5), bottom_c("StorageAdapter", dx=5),
      style=(0, (4, 3)), color="#64748b")
arrow(right("Quiz"), left("GradeStrategy"), "uses", lx=53, ly=geom["Quiz"][1] - 1.5)
arrow(top_c("PercentStrategy", dx=-5), bottom_c("GradeStrategy", dx=-5),
      style=(0, (4, 3)), color="#64748b")
arrow(top_c("PassFailStrategy", dx=5), bottom_c("GradeStrategy", dx=5),
      style=(0, (4, 3)), color="#64748b")

# --- boxes (drawn on top) ------------------------------------------------------
for name, (x, lines, title) in specs.items():
    _, top, h = geom[name]
    ax.add_patch(FancyBboxPatch((x, top - h), BOX_W, h,
                 boxstyle="round,pad=0.2,rounding_size=0.6",
                 fc="white", ec="#14532d", lw=1.4, zorder=2))
    ax.add_patch(FancyBboxPatch((x, top - TITLE_H), BOX_W, TITLE_H,
                 boxstyle="round,pad=0.2,rounding_size=0.6",
                 fc="#14532d", ec="#14532d", lw=1.4, zorder=2))
    ax.text(x + BOX_W / 2, top - TITLE_H / 2, title, ha="center", va="center",
            color="white", fontsize=9.5, fontweight="bold", zorder=3)
    ax.text(x + 0.8, top - TITLE_H - 0.3, "\n".join(lines), ha="left", va="top",
            fontsize=8.5, family="monospace", color="#1c2733", zorder=3)

ax.text(39, 19.5, "The Store holds lists of Course, Lesson, Student, Enrollment, Quiz and Attempt.\n"
                  "submitQuiz() returns an Attempt (score, total, result, passed, takenAt).\n"
                  "A dashed arrow means 'carries out' (the box below does what the interface above asks).\n"
                  "The MockStorage adapter is used only by the tests and is not shown here.",
        ha="center", va="top", fontsize=8.5, style="italic", color="#475569")

plt.tight_layout()
plt.savefig("/home/hatch/workspace/campuslearn/docs/uml_class_diagram.png", dpi=200, bbox_inches="tight")
print("saved docs/uml_class_diagram.png")
