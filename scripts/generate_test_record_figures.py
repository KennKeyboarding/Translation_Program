from pathlib import Path
import csv
import re

import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties, fontManager
import pandas as pd


FIVE_PT = 10.5


def pick_font(preferred, fallback):
    available = {font.name for font in fontManager.ttflist}
    for name in preferred:
        if name in available:
            return FontProperties(family=name, size=FIVE_PT)
    return FontProperties(family=fallback, size=FIVE_PT)


ZH_FONT = pick_font(
    ["SimSun", "STSong", "Songti SC", "Microsoft YaHei", "Noto Sans CJK SC", "SimHei"],
    "DejaVu Sans",
)
EN_FONT = pick_font(
    ["Times New Roman", "Times", "Nimbus Roman", "DejaVu Serif"],
    "DejaVu Serif",
)

plt.rcParams["axes.unicode_minus"] = False


def parse_numeric(value):
    text = str(value).strip()
    if not text:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    return float(match.group(0)) if match else None


def split_markdown_tables(text):
    tables = []
    lines = text.splitlines()
    current_title = None
    current_table = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|"):
            current_table.append(stripped)
            continue

        if current_table:
            if len(current_table) >= 3:
                tables.append((current_title or "", current_table[:]))
            current_table = []

        if stripped:
            current_title = stripped

    if current_table and len(current_table) >= 3:
        tables.append((current_title or "", current_table[:]))

    return tables


def parse_table_rows(table_lines):
    rows = []
    for line in table_lines[2:]:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if any(cells):
            rows.append(cells)
    return rows


def load_scene_tables(markdown_path):
    text = markdown_path.read_text(encoding="utf-8")
    tables = split_markdown_tables(text)
    if len(tables) < 5:
        raise ValueError("Expected at least 5 markdown tables in test_record.md")

    scene_names = ["menu", "notice", "instruction", "goods", "poster"]
    scene_tables = {}

    for scene_name, (_, table_lines) in zip(scene_names, tables[:5]):
        scene_tables[scene_name] = parse_table_rows(table_lines)

    return scene_tables


def build_menu_dataframe(rows):
    records = []
    for row in rows:
        if len(row) < 5:
            continue

        sample = row[0]
        recognized_blocks = parse_numeric(row[1])
        manual_valid = parse_numeric(row[2])
        recognized_valid = parse_numeric(row[3])
        correct_valid = parse_numeric(row[4])

        if not sample or manual_valid in (None, 0):
            continue

        records.append(
            {
                "sample": sample,
                "recognized_blocks": recognized_blocks,
                "manual_valid": manual_valid,
                "recognized_valid": recognized_valid,
                "correct_valid": correct_valid,
                "ETRR": (recognized_valid / manual_valid) if recognized_valid is not None else None,
                "TAR": (correct_valid / manual_valid) if correct_valid is not None else None,
            }
        )

    return pd.DataFrame(records)


def build_long_text_dataframe(scene_tables):
    scene_map = {
        "notice": "Campus Notices",
        "instruction": "Instructions",
        "goods": "Product Labels",
        "poster": "Posters",
    }

    records = []
    for key, display_name in scene_map.items():
        for row in scene_tables[key]:
            if len(row) < 3:
                continue

            sample = row[0]
            recognized_keywords = parse_numeric(row[1])
            correct_keywords = parse_numeric(row[2])
            if not sample or recognized_keywords in (None, 0):
                continue

            records.append(
                {
                    "scene": display_name,
                    "sample": sample,
                    "recognized_keywords": recognized_keywords,
                    "correct_keywords": correct_keywords,
                    "KRR": correct_keywords / recognized_keywords,
                }
            )

    return pd.DataFrame(records)


def style_tick_labels(axis):
    for label in axis.get_xticklabels():
        label.set_fontproperties(EN_FONT)
    for label in axis.get_yticklabels():
        label.set_fontproperties(EN_FONT)


def plot_short_text_metrics(menu_df, output_path):
    fig, ax_rate = plt.subplots(figsize=(12.5, 6.2), facecolor="white")
    ax_count = ax_rate.twinx()
    ax_rate.set_zorder(3)
    ax_count.set_zorder(2)
    ax_rate.patch.set_alpha(0)

    x = list(range(len(menu_df)))
    manual_positions = [value - 0.26 for value in x]
    recognized_positions = [value for value in x]
    correct_positions = [value + 0.26 for value in x]

    manual_bars = ax_count.bar(
        manual_positions,
        menu_df["manual_valid"],
        width=0.22,
        color="#d8e8fb",
        edgecolor="#9fb3d9",
        linewidth=0.8,
        label="Manual Valid Blocks",
        zorder=1,
    )
    recognized_bars = ax_count.bar(
        recognized_positions,
        menu_df["recognized_blocks"],
        width=0.22,
        color="#e1f3e8",
        edgecolor="#96b59f",
        linewidth=0.8,
        label="Recognized Blocks",
        zorder=1,
    )
    correct_bars = ax_count.bar(
        correct_positions,
        menu_df["correct_valid"],
        width=0.22,
        color="#fbe6c8",
        edgecolor="#c7a57a",
        linewidth=0.8,
        label="Correct Blocks",
        zorder=1,
    )
    etrr_line = ax_rate.plot(
        x,
        menu_df["ETRR"] * 100,
        color="#6f8fc8",
        marker="o",
        linewidth=1.4,
        markersize=4.5,
        label="ETRR",
        zorder=5,
    )[0]
    tar_line = ax_rate.plot(
        x,
        menu_df["TAR"] * 100,
        color="#78b58f",
        marker="s",
        linewidth=1.4,
        markersize=4.5,
        label="TAR",
        zorder=4,
    )[0]

    ax_rate.set_title("图8-1 短文本场景核心指标对比", fontproperties=ZH_FONT, pad=12)
    ax_rate.set_xlabel("Menu Samples", fontproperties=EN_FONT, labelpad=8)
    ax_rate.set_ylabel("Rate (%)", fontproperties=EN_FONT, labelpad=8)
    ax_count.set_ylabel("Blocks", fontproperties=EN_FONT, labelpad=10)

    ax_rate.set_xticks(x)
    ax_rate.set_xticklabels(menu_df["sample"])
    ax_rate.set_ylim(0, 110)
    ax_count.set_ylim(0, max(menu_df["recognized_blocks"]) * 1.26)
    ax_rate.set_xlim(-0.42, len(menu_df) - 0.58)

    ax_rate.grid(axis="y", linestyle="--", alpha=0.25)
    ax_rate.set_axisbelow(True)

    style_tick_labels(ax_rate)
    style_tick_labels(ax_count)
    ax_rate.set_yticks([0, 20, 40, 60, 80, 100])

    block_label_offset = max(menu_df["recognized_blocks"]) * 0.018
    for bar_group in (manual_bars, recognized_bars, correct_bars):
        for bar in bar_group:
            height = bar.get_height()
            ax_count.text(
                bar.get_x() + bar.get_width() / 2,
                height + block_label_offset,
                f"{int(round(height))}",
                ha="center",
                va="bottom",
                fontproperties=EN_FONT.copy(),
                fontsize=8.5,
            )

    for index, (point_x, point_y) in enumerate(zip(x, menu_df["ETRR"])):
        if index == 0:
            x_offset = 0.18
        elif index == 1:
            x_offset = 0.10
        else:
            x_offset = 0
        y_offset = 0.02
        paired_diff = menu_df["ETRR"].iloc[index] - menu_df["TAR"].iloc[index]
        if paired_diff < 0.05:
            y_offset = 0.035
        point_y_percent = point_y * 100
        label_y = min(point_y_percent + (y_offset * 100), 107.5)
        ax_rate.text(
            point_x + x_offset,
            label_y,
            f"{point_y_percent:.1f}",
            ha="center",
            va="bottom",
            fontproperties=EN_FONT.copy(),
            fontsize=8.5,
            zorder=6,
        )

    for index, (point_x, point_y) in enumerate(zip(x, menu_df["TAR"])):
        if index == 0:
            x_offset = 0.20
        elif index == 1:
            x_offset = 0.12
        else:
            x_offset = 0
        y_offset = -0.03
        paired_diff = menu_df["ETRR"].iloc[index] - menu_df["TAR"].iloc[index]
        if paired_diff < 0.05:
            y_offset = -0.05
        point_y_percent = point_y * 100
        label_y = max(point_y_percent + (y_offset * 100), 2.0)
        ax_rate.text(
            point_x + x_offset,
            label_y,
            f"{point_y_percent:.1f}",
            ha="center",
            va="top",
            fontproperties=EN_FONT.copy(),
            fontsize=8.5,
            zorder=7,
        )

    handles = [manual_bars, recognized_bars, correct_bars, etrr_line, tar_line]
    labels = ["Manual Valid Blocks", "Recognized Blocks", "Correct Blocks", "ETRR", "TAR"]
    legend = ax_rate.legend(
        handles,
        labels,
        loc="upper left",
        bbox_to_anchor=(0.04, 0.80),
        frameon=True,
        facecolor="white",
        edgecolor="#d0d7de",
        prop=EN_FONT,
    )
    legend.get_frame().set_linewidth(0.8)
    for text in legend.get_texts():
        text.set_fontsize(9.2)

    fig.tight_layout()
    fig.savefig(output_path, dpi=360, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def build_long_text_positions(long_df):
    grouped = long_df.groupby("scene", sort=False)
    positions = []
    scene_centers = {}
    start = 0.0
    group_gap = 1.2

    for scene, scene_df in grouped:
        scene_positions = [start + idx * 0.28 for idx in range(len(scene_df))]
        positions.extend(scene_positions)
        scene_centers[scene] = sum(scene_positions) / len(scene_positions)
        start = scene_positions[-1] + group_gap

    return positions, scene_centers


def plot_long_text_krr(long_df, output_path):
    fig, ax_count = plt.subplots(figsize=(10.6, 6.1), facecolor="white")
    ax_krr = ax_count.twinx()

    summary = (
        long_df.groupby("scene", sort=False)[["recognized_keywords", "correct_keywords", "KRR"]]
        .mean()
        .reset_index()
    )

    x = list(range(len(summary)))
    recognized_bars = ax_count.bar(
        [value - 0.18 for value in x],
        summary["recognized_keywords"],
        width=0.32,
        color="#d8e8fb",
        edgecolor="#9fb3d9",
        linewidth=0.8,
        label="Avg Recognized Keywords",
        zorder=1,
    )
    correct_bars = ax_count.bar(
        [value + 0.18 for value in x],
        summary["correct_keywords"],
        width=0.32,
        color="#e1f3e8",
        edgecolor="#96b59f",
        linewidth=0.8,
        label="Avg Correct Keywords",
        zorder=1,
    )
    krr_line = ax_krr.plot(
        x,
        summary["KRR"] * 100,
        color="#7aa6d8",
        marker="o",
        linewidth=1.6,
        markersize=5.0,
        label="KRR",
        zorder=4,
    )[0]

    ax_krr.set_title("图8-2 长文本场景关键词识别正确率", fontproperties=ZH_FONT, pad=12)
    ax_krr.set_xlabel("Long-text Scenarios", fontproperties=EN_FONT, labelpad=24)
    ax_count.set_ylabel("Average Keyword Count", fontproperties=EN_FONT, labelpad=8)
    ax_krr.set_ylabel("KRR (%)", fontproperties=EN_FONT, labelpad=10)
    ax_krr.set_ylim(0, 105)
    ax_count.set_ylim(0, max(summary["recognized_keywords"].max(), summary["correct_keywords"].max()) * 1.28)
    ax_krr.set_xlim(-0.55, len(summary) - 0.45)
    ax_krr.set_xticks(x)
    ax_krr.set_xticklabels(summary["scene"])
    ax_count.grid(axis="y", linestyle="--", alpha=0.25)
    ax_count.set_axisbelow(True)

    style_tick_labels(ax_count)
    style_tick_labels(ax_krr)
    ax_krr.set_yticks([0, 20, 40, 60, 80, 100])

    ax_krr.text(
        0.985,
        0.985,
        "KRR = Keyword Recognition Rate",
        transform=ax_krr.transAxes,
        ha="right",
        va="top",
        fontproperties=EN_FONT.copy(),
        fontsize=9.5,
        bbox={"facecolor": "white", "edgecolor": "#d0d7de", "boxstyle": "round,pad=0.25"},
    )

    count_offset = max(summary["recognized_keywords"].max(), summary["correct_keywords"].max()) * 0.025
    for bars in (recognized_bars, correct_bars):
        for bar in bars:
            height = bar.get_height()
            ax_count.text(
                bar.get_x() + bar.get_width() / 2,
                height + count_offset,
                f"{height:.1f}",
                ha="center",
                va="bottom",
                fontproperties=EN_FONT.copy(),
                fontsize=8.5,
            )

    for point_x, point_y in zip(x, summary["KRR"]):
        point_y_percent = point_y * 100
        ax_krr.text(
            point_x,
            min(point_y_percent + 3, 103.5),
            f"{point_y_percent:.1f}",
            ha="center",
            va="bottom",
            fontproperties=EN_FONT.copy(),
            fontsize=9.5,
        )

    legend = ax_krr.legend(
        [recognized_bars, correct_bars, krr_line],
        ["Avg Recognized Keywords", "Avg Correct Keywords", "KRR"],
        loc="upper left",
        bbox_to_anchor=(0.02, 0.84),
        frameon=True,
        facecolor="white",
        edgecolor="#d0d7de",
        prop=EN_FONT,
    )
    legend.get_frame().set_linewidth(0.8)

    fig.tight_layout()
    fig.savefig(output_path, dpi=360, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def write_summary_csv(menu_df, long_df, output_path):
    rows = []

    for _, row in menu_df.iterrows():
        rows.append(
            {
                "category": "short_text_menu",
                "sample_or_scene": row["sample"],
                "recognized_text_blocks": int(row["recognized_blocks"]),
                "ETRR": round(row["ETRR"], 4),
                "TAR": round(row["TAR"], 4),
                "recognized_keywords": "",
                "KRR": "",
                "sample_count": 1,
            }
        )

    for scene, scene_df in long_df.groupby("scene", sort=False):
        rows.append(
            {
                "category": "long_text_scene_average",
                "sample_or_scene": scene,
                "recognized_text_blocks": "",
                "ETRR": "",
                "TAR": "",
                "recognized_keywords": round(scene_df["recognized_keywords"].mean(), 2),
                "KRR": round(scene_df["KRR"].mean(), 4),
                "sample_count": len(scene_df),
            }
        )

    with output_path.open("w", newline="", encoding="utf-8-sig") as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=[
                "category",
                "sample_or_scene",
                "recognized_text_blocks",
                "ETRR",
                "TAR",
                "recognized_keywords",
                "KRR",
                "sample_count",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def main():
    project_root = Path(__file__).resolve().parents[2]
    markdown_path = project_root / "test_record.md"
    output_dir = project_root / "translation_program" / "docs" / "chapter8_figures"
    output_dir.mkdir(parents=True, exist_ok=True)

    scene_tables = load_scene_tables(markdown_path)
    menu_df = build_menu_dataframe(scene_tables["menu"])
    long_df = build_long_text_dataframe(scene_tables)

    fig1_path = output_dir / "fig8_1_short_text_metrics.png"
    fig2_path = output_dir / "fig8_2_long_text_krr.png"
    csv_path = output_dir / "test_metrics_summary.csv"

    plot_short_text_metrics(menu_df, fig1_path)
    plot_long_text_krr(long_df, fig2_path)
    write_summary_csv(menu_df, long_df, csv_path)

    avg_etrr = menu_df["ETRR"].mean()
    avg_tar = menu_df["TAR"].mean()
    long_scene_summary = long_df.groupby("scene", sort=False)["KRR"].mean().reset_index()
    highest_krr_row = long_scene_summary.loc[long_scene_summary["KRR"].idxmax()]
    lowest_krr_row = long_scene_summary.loc[long_scene_summary["KRR"].idxmin()]

    print(f"Short-text average ETRR: {avg_etrr:.4f}")
    print(f"Short-text average TAR: {avg_tar:.4f}")
    for _, row in long_scene_summary.iterrows():
        print(f"{row['scene']} average KRR: {row['KRR']:.4f}")
    print(f"Highest KRR scene: {highest_krr_row['scene']} ({highest_krr_row['KRR']:.4f})")
    print(f"Lowest KRR scene: {lowest_krr_row['scene']} ({lowest_krr_row['KRR']:.4f})")
    print(f"Saved: {fig1_path}")
    print(f"Saved: {fig2_path}")
    print(f"Saved: {csv_path}")


if __name__ == "__main__":
    main()
