"""Draw the first mock-up (wireframe) of the CampusLearn page."""
from PIL import Image, ImageDraw

W, H = 1000, 660
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)

def rect(x0, y0, x1, y1, fill, outline="#94a3b8", width=2):
    d.rectangle([x0, y0, x1, y1], fill=fill, outline=outline, width=width)

def label(x, y, text, fill="#334155"):
    d.text((x, y), text, fill=fill)

# browser bar
rect(10, 10, 990, 46, "#e2e8f0")
d.ellipse([26, 22, 38, 34], fill="#ef4444")
d.ellipse([48, 22, 60, 34], fill="#f59e0b")
d.ellipse([70, 22, 82, 34], fill="#22c55e")
rect(110, 18, 700, 38, "white")
label(120, 22, "campuslearn  —  home page")

# header
rect(10, 56, 990, 130, "#14532d", outline="#14532d")
label(30, 66, "CampusLearn", fill="white")
label(30, 96, "Online learning for our campus", fill="#d9eadf")
# tabs
for i, t in enumerate(["Dashboard", "Courses", "Lessons", "Students", "Enrolments", "Quizzes", "Progress"]):
    x = 30 + i * 118
    d.text((x, 116), t, fill="#fbbf24" if i == 0 else "#d9eadf")

# number cards
for i, t in enumerate(["3  Courses", "3  Students", "4  Enrolments", "2  Quizzes"]):
    x = 30 + i * 170
    rect(x, 150, x + 155, 215, "#f8fafc")
    label(x + 12, 162, t)
    label(x + 12, 188, "count", fill="#64748b")

# course list
rect(30, 235, 640, 470, "white")
label(45, 245, "Courses at a glance")
for i, t in enumerate(["Introduction to Programming  —  Ms. Rahman  (2 of 30 seats)",
                       "Database Basics  —  Mr. Karim  (1 of 25 seats)",
                       "Web Development  —  Ms. Rahman  (1 of 30 seats)"]):
    y = 280 + i * 56
    rect(45, y, 625, y + 42, "#f8fafc")
    label(58, y + 12, t)

# add course form
rect(665, 235, 970, 470, "#f1f5f9")
label(685, 245, "Add a course")
for i, t in enumerate(["Course title", "Teacher name", "Short description"]):
    y = 280 + i * 52
    rect(685, y, 950, y + 36, "white")
    label(695, y + 10, t, fill="#94a3b8")
rect(685, 440, 830, 470, "#14532d", outline="#14532d")
label(710, 448, "Add course", fill="white")

# footer note
label(30, 500, "Mock-up 1 — the dashboard as first drawn. The finished page keeps this same")
label(30, 522, "shape: green header, tabs across the top, number cards, list on the left,")
label(30, 544, "form on the right. Built with plain HTML and CSS; no pictures needed.")
label(30, 590, "Made before the code, to agree the layout first.", fill="#64748b")

img.save("/home/hatch/workspace/campuslearn/docs/wireframe.png")
print("saved docs/wireframe.png")
