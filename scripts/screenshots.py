"""用 Playwright 截取 VoiceCanvas 界面图，写入 docs/screenshots/。

前置：后端(5001) + 前端(5173) 已启动。通过 dev 钩子 window.__vcSay(text)
程序化触发与语音相同的指令流水线（无需真实麦克风）。

用法：python3.14 scripts/screenshots.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
URL = "http://localhost:5173"


def say(page, text: str):
    page.evaluate("(t) => window.__vcSay && window.__vcSay(t)", text)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 840})
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(1200)

        # 1) 初始界面
        page.screenshot(path=str(OUT / "01-home.png"))
        print("✓ 01-home.png")

        # 2) 基础 + 复杂图形（规则快路径 + LLM 拆解），分散落位避免遮挡
        say(page, "在左上角画一个红色的圆")
        page.wait_for_timeout(2800)
        say(page, "在右上角画一个蓝色的三角形")
        page.wait_for_timeout(2800)
        say(page, "画三个绿色的圆排成一行")
        page.wait_for_timeout(3000)
        page.screenshot(path=str(OUT / "02-shapes.png"))
        print("✓ 02-shapes.png")

        # 3) 语义场景生成（场景图分解 + 文生图）
        say(page, "清空")
        page.wait_for_timeout(500)
        say(page, "画一只躺着的加菲猫，靠在黑色桌子边，桌上有一盆花")
        page.wait_for_timeout(30000)  # 等场景解析 + 4 个实体文生图回填（每张 2-5s）
        page.screenshot(path=str(OUT / "03-scene.png"))
        print("✓ 03-scene.png")

        # 4) 同音词典配置页
        page.get_by_text("同音词典").click()
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "04-dict-config.png"))
        print("✓ 04-dict-config.png")

        browser.close()


if __name__ == "__main__":
    main()
