from io import BytesIO
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
LONG_PAGES = ROOT / "tmp" / "mobile-long"
STORIES = ROOT.parent / "work" / "pdf-slides"
OUTPUT = ROOT / "downloads" / "ai-automation-vibe-coding-moyi-mobile.pdf"
W, H = 360, 640
PIXEL_W, PIXEL_H = 1080, 1920
CONTENT_H = 1760

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))

STORY_GROUPS = {
    4: ("AI 답변 생성", "한 단어씩 답변이 완성되는 과정", "llm"),
    6: ("토큰화", "문장이 의미 조각으로 나뉘는 과정", "tokens"),
    33: ("에이전트 실행", "목표를 실제 결과로 바꾸는 과정", "process"),
}


def row_activity(image: Image.Image, y: int) -> int:
    row = image.crop((0, y, image.width, min(y + 2, image.height))).resize((180, 1)).convert("L")
    values = list(row.getdata())
    edges = sorted(values[:14] + values[-14:])
    baseline = edges[len(edges) // 2]
    return sum(1 for value in values if abs(value - baseline) > 6)


def find_break(image: Image.Image, start: int) -> int:
    target = min(start + CONTENT_H, image.height)
    if image.height - start <= CONTENT_H:
        return image.height
    lower = max(start + 1000, target - 500)
    upper = min(image.height - 450, target + 80)
    if upper <= lower:
        return target
    candidates = []
    for y in range(lower, upper + 1, 4):
        activity = sum(row_activity(image, yy) for yy in range(y, min(y + 18, image.height), 3))
        candidates.append((activity, abs(target - y), y))
    return min(candidates)[2]


def split_slide(path: Path) -> list[Image.Image]:
    image = Image.open(path).convert("RGB")
    if image.height <= 2150:
        return [image]
    parts = []
    start = 0
    while start < image.height:
        end = find_break(image, start)
        parts.append(image.crop((0, start, image.width, end)))
        start = end
    return parts


def jpeg_reader(image: Image.Image, quality: int = 88) -> ImageReader:
    data = BytesIO()
    image.save(data, format="JPEG", quality=quality, optimize=True)
    data.seek(0)
    return ImageReader(data)


def footer_mark(c: canvas.Canvas) -> None:
    c.setFillColor(HexColor("#69758e"))
    c.setFont("MalgunBold", 6.5)
    c.drawRightString(W - 12, 6, "@MOYI · MOBILE EDITION")


def draw_slide_part(c: canvas.Canvas, image: Image.Image, slide_no: int, part: int, parts: int) -> None:
    c.setFillColor(HexColor("#080b12"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    max_h = 574 if parts > 1 else 616
    scale = min(W / (image.width / 3), max_h / (image.height / 3))
    draw_h = min(max_h, image.height / 3 * scale)
    draw_w = image.width / 3 * scale
    x = (W - draw_w) / 2
    y = H - 28 - draw_h if parts > 1 else 16 + (616 - draw_h) / 2
    c.drawImage(jpeg_reader(image), x, y, width=draw_w, height=draw_h, preserveAspectRatio=True)
    if parts > 1:
        c.setFillColor(HexColor("#9ba8c4"))
        c.setFont("MalgunBold", 8)
        c.drawString(16, 617, f"SLIDE {slide_no:02d}")
        c.setFillColor(HexColor("#806aff"))
        c.drawRightString(344, 617, f"{part}/{parts}")
    footer_mark(c)
    c.showPage()


def draw_story_page(c: canvas.Canvas, title: str, subtitle: str, frame: Path, cut: int) -> None:
    c.setFillColor(HexColor("#080b12"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor("#806aff"))
    c.roundRect(20, 584, 56, 22, 11, fill=1, stroke=0)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("MalgunBold", 9)
    c.drawCentredString(48, 591, f"CUT {cut}/4")
    c.setFont("MalgunBold", 22)
    c.drawString(20, 548, title)
    c.setFillColor(HexColor("#9ba8c4"))
    c.setFont("Malgun", 11)
    c.drawString(20, 526, subtitle)
    with Image.open(frame) as source:
        iw, ih = source.size
    scale = min(320 / iw, 390 / ih)
    dw, dh = iw * scale, ih * scale
    c.setFillColor(HexColor("#121827"))
    c.roundRect(14, 112, 332, 398, 12, fill=1, stroke=0)
    c.drawImage(str(frame), (W - dw) / 2, 128 + (366 - dh) / 2, width=dw, height=dh)
    labels = ["상황과 입력을 확인합니다.", "첫 변화가 시작됩니다.", "중간 결과가 확장됩니다.", "최종 결과를 확인합니다."]
    c.setFillColor(HexColor("#f3f6ff"))
    c.setFont("MalgunBold", 13)
    c.drawString(20, 78, labels[cut - 1])
    footer_mark(c)
    c.showPage()


def main() -> None:
    slides = sorted(LONG_PAGES.glob("slide-*.jpg"))
    if not slides:
        raise SystemExit("No source slides found")
    c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("AI 업무자동화 바이브코딩 워크숍 - 모바일 가독성판")
    c.setAuthor("@MOYI")
    page_count = 0
    for slide_no, path in enumerate(slides, 1):
        parts = split_slide(path)
        for part_no, part in enumerate(parts, 1):
            draw_slide_part(c, part, slide_no, part_no, len(parts))
            page_count += 1
        if slide_no in STORY_GROUPS:
            title, subtitle, key = STORY_GROUPS[slide_no]
            for cut in range(1, 5):
                draw_story_page(c, title, subtitle, STORIES / f"story-{key}-{cut}.png", cut)
                page_count += 1
    c.save()
    print(f"{OUTPUT}\npages={page_count}")


if __name__ == "__main__":
    main()
