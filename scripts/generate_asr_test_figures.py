from __future__ import annotations

import csv
import re
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager


ROOT = Path(__file__).resolve().parents[2]
INPUT_PATH = ROOT / "test_asr.md"
OUTPUT_DIR = ROOT / "translation_program" / "docs" / "chapter8_figures"
FIG_KEYWORD_PATH = OUTPUT_DIR / "fig8_asr_keyword_metrics.png"
FIG_TIME_PATH = OUTPUT_DIR / "fig8_asr_processing_time.png"
CSV_PATH = OUTPUT_DIR / "asr_metrics_summary.csv"

SCENARIO_INFO = {
    "order": ("Ordering Dialogues", "餐馆点单"),
    "msg": ("Voice Messages", "电话留言"),
    "class": ("Classroom Notices", "课堂通知"),
}


def pick_font(preferred_names: list[str], fallback: str = "DejaVu Sans") -> str:
    available = {f.name for f in font_manager.fontManager.ttflist}
    for name in preferred_names:
        if name in available:
            return name
    return fallback


CN_FONT = pick_font(["SimSun", "NSimSun", "Songti SC", "STSong", "Microsoft YaHei", "SimHei"])
EN_FONT = pick_font(["Times New Roman", "Times New Roman PS MT", "Liberation Serif"])


def configure_matplotlib() -> None:
    plt.rcParams["figure.facecolor"] = "white"
    plt.rcParams["axes.facecolor"] = "white"
    plt.rcParams["savefig.facecolor"] = "white"
    plt.rcParams["axes.unicode_minus"] = False
    plt.rcParams["font.family"] = [EN_FONT, CN_FONT, "DejaVu Sans"]
    plt.rcParams["font.size"] = 10.5
    plt.rcParams["axes.titlesize"] = 12
    plt.rcParams["axes.labelsize"] = 10.5
    plt.rcParams["xtick.labelsize"] = 10
    plt.rcParams["ytick.labelsize"] = 10
    plt.rcParams["legend.fontsize"] = 9.5


def parse_markdown_tables(path: Path) -> dict[str, list[dict[str, float | str]]]:
    content = path.read_text(encoding="utf-8", errors="ignore")
    scenarios: dict[str, list[dict[str, float | str]]] = {key: [] for key in SCENARIO_INFO}

    row_pattern = re.compile(
        r"^(order\d+|msg\d+|class\d+)\|(\d+)\|(\d+)\|([0-9]+(?:\.[0-9]+)?)\|(.*)$",
        re.MULTILINE,
    )

    for sample_id, recognized, correct, elapsed, note in row_pattern.findall(content):
        prefix = re.match(r"^[a-z]+", sample_id)
        if not prefix:
            continue

        scenario_key = prefix.group(0)
        if scenario_key not in scenarios:
            continue

        recognized_count = int(recognized)
        correct_count = int(correct)
        elapsed_seconds = float(elapsed)
        krr = (correct_count / recognized_count) if recognized_count else 0.0

        scenarios[scenario_key].append(
            {
                "sample": sample_id,
                "recognized_keywords": recognized_count,
                "correct_keywords": correct_count,
                "elapsed_seconds": elapsed_seconds,
                "krr": krr,
                "note": note.strip(),
            }
        )

    return scenarios


def compute_summary_rows(scenarios: dict[str, list[dict[str, float | str]]]) -> list[dict[str, float | str]]:
    rows: list[dict[str, float | str]] = []
    for key, records in scenarios.items():
        if not records:
            continue

        avg_recognized = sum(float(r["recognized_keywords"]) for r in records) / len(records)
        avg_correct = sum(float(r["correct_keywords"]) for r in records) / len(records)
        avg_krr = sum(float(r["krr"]) for r in records) / len(records)
        avg_time = sum(float(r["elapsed_seconds"]) for r in records) / len(records)
        en_name, zh_name = SCENARIO_INFO[key]

        rows.append(
            {
                "scenario_key": key,
                "scenario_en": en_name,
                "scenario_zh": zh_name,
                "sample_count": len(records),
                "avg_recognized_keywords": round(avg_recognized, 4),
                "avg_correct_keywords": round(avg_correct, 4),
                "avg_krr": round(avg_krr, 4),
                "avg_processing_time_s": round(avg_time, 4),
            }
        )

    return rows


def save_summary_csv(rows: list[dict[str, float | str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "scenario_key",
        "scenario_en",
        "scenario_zh",
        "sample_count",
        "avg_recognized_keywords",
        "avg_correct_keywords",
        "avg_krr",
        "avg_processing_time_s",
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def annotate_bar_values(ax, bars, dy: float = 0.35) -> None:
    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height + dy,
            f"{height:.1f}",
            ha="center",
            va="bottom",
            fontsize=9,
            zorder=6,
        )


def generate_keyword_metrics_figure(rows: list[dict[str, float | str]], path: Path) -> None:
    labels = [row["scenario_en"] for row in rows]
    avg_recognized = [float(row["avg_recognized_keywords"]) for row in rows]
    avg_correct = [float(row["avg_correct_keywords"]) for row in rows]
    avg_krr = [float(row["avg_krr"]) for row in rows]
    x_positions = [0.0, 0.92, 1.84]
    bar_width = 0.28

    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax2 = ax.twinx()

    recognized_bars = ax.bar(
        [x - bar_width / 2 for x in x_positions],
        avg_recognized,
        width=bar_width,
        color="#bfdbfe",
        edgecolor="#93c5fd",
        linewidth=0.8,
        label="Avg. Recognized Keywords",
        zorder=3,
    )
    correct_bars = ax.bar(
        [x + bar_width / 2 for x in x_positions],
        avg_correct,
        width=bar_width,
        color="#bbf7d0",
        edgecolor="#86efac",
        linewidth=0.8,
        label="Avg. Correct Keywords",
        zorder=3,
    )

    krr_line = ax2.plot(
        x_positions,
        [value * 100 for value in avg_krr],
        color="#2563eb",
        marker="o",
        linewidth=2.0,
        markersize=6,
        label="AKRR",
        zorder=5,
    )

    for x, value in zip(x_positions, avg_krr):
        value_percent = value * 100
        ax2.text(
            x,
            min(value_percent + 3, 107),
            f"{value_percent:.1f}",
            ha="center",
            va="bottom",
            fontsize=9,
            color="#1d4ed8",
            zorder=6,
        )

    annotate_bar_values(ax, recognized_bars)
    annotate_bar_values(ax, correct_bars)

    ax.set_title("ASR Keyword Recognition Performance", pad=12)
    ax.set_xlabel("Speech Scenarios")
    ax.set_ylabel("Average Keyword Count")
    ax2.set_ylabel("Average AKRR (%)")
    ax.set_xticks(x_positions)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, max(max(avg_recognized), max(avg_correct)) * 1.22)
    ax2.set_ylim(0, 110)
    ax2.set_yticks([0, 20, 40, 60, 80, 100])
    ax.set_xlim(-0.42, x_positions[-1] + 0.42)
    ax.grid(axis="y", linestyle="--", linewidth=0.6, alpha=0.35, zorder=0)
    ax.set_axisbelow(True)

    lines_labels = [ax.get_legend_handles_labels(), ax2.get_legend_handles_labels()]
    handles = lines_labels[0][0] + lines_labels[1][0]
    labels_all = lines_labels[0][1] + lines_labels[1][1]
    ax.legend(handles, labels_all, loc="upper left", frameon=True, framealpha=0.92)

    for spine in ax.spines.values():
        spine.set_color("#cbd5e1")
    for spine in ax2.spines.values():
        spine.set_color("#cbd5e1")

    fig.tight_layout()
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def generate_processing_time_figure(rows: list[dict[str, float | str]], path: Path) -> None:
    labels = [row["scenario_en"] for row in rows]
    avg_times = [float(row["avg_processing_time_s"]) for row in rows]
    x_positions = list(range(len(labels)))

    fig, ax = plt.subplots(figsize=(9.4, 5.8), dpi=300)
    bars = ax.bar(
        x_positions,
        avg_times,
        width=0.52,
        color="#fde68a",
        edgecolor="#fcd34d",
        linewidth=0.8,
        zorder=3,
    )

    for x, value in zip(x_positions, avg_times):
        ax.text(
            x,
            value + 0.12,
            f"{value:.2f}",
            ha="center",
            va="bottom",
            fontsize=9,
            zorder=5,
        )

    ax.set_title("ASR Average Processing Time", pad=12)
    ax.set_xlabel("Speech Scenarios")
    ax.set_ylabel("Average Time (s)")
    ax.set_xticks(x_positions)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, max(avg_times) * 1.22)
    ax.grid(axis="y", linestyle="--", linewidth=0.6, alpha=0.35, zorder=0)
    ax.set_axisbelow(True)

    for spine in ax.spines.values():
        spine.set_color("#cbd5e1")

    fig.tight_layout()
    fig.savefig(path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def print_summary(rows: list[dict[str, float | str]]) -> None:
    print("ASR summary")
    for row in rows:
        print(
            f"- {row['scenario_en']}: "
            f"avg recognized={row['avg_recognized_keywords']:.2f}, "
            f"avg correct={row['avg_correct_keywords']:.2f}, "
            f"avg KRR={row['avg_krr']:.4f}, "
            f"avg time={row['avg_processing_time_s']:.2f}s"
        )


def main() -> None:
    configure_matplotlib()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    scenarios = parse_markdown_tables(INPUT_PATH)
    summary_rows = compute_summary_rows(scenarios)
    save_summary_csv(summary_rows, CSV_PATH)
    generate_keyword_metrics_figure(summary_rows, FIG_KEYWORD_PATH)
    generate_processing_time_figure(summary_rows, FIG_TIME_PATH)
    print_summary(summary_rows)
    print(f"Saved: {FIG_KEYWORD_PATH}")
    print(f"Saved: {FIG_TIME_PATH}")
    print(f"Saved: {CSV_PATH}")


if __name__ == "__main__":
    main()
