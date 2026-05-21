from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


MENU_DATA = [
    ("menu1", 41, 42, 40, 39, 30, 27, 39, 39, 11.4, 206.14),
    ("menu2", 15, 15, 15, 14, 12, 10, 12, 14, 18.1, 262.45),
    ("menu3", 46, 46, 46, 44, 30, 30, 46, 44, 17.5, 254.28),
    ("menu4", 29, 32, 29, 25, 20, 19, 27, 25, 15.4, 532.55),
    ("menu5", 50, 51, 50, 50, 47, 47, 50, 50, 19.5, 161.81),
    ("menu6", 45, 45, 45, 44, 30, 30, 43, 44, 13.9, 109.92),
    ("menu7", 36, 31, 31, 28, 52, 47, 29, 28, 14.5, 123.41),
    ("menu8", 58, 60, 58, 32, 50, 49, 58, 57, 15.9, 162.72),
    ("menu9", 62, 62, 62, 61, 54, 54, 62, 59, 16.8, 166.34),
    ("menu10", 45, 45, 44, 40, 33, 32, 40, 40, 18.3, 179.62),
]

LONG_TEXT_DATA = {
    "Notice": [
        ("notice1", 8, 8, 1, 1, 6, 8, 16.0, 76.91),
        ("notice2", 11, 11, 0, 0, 10, 11, 18.2, 55.74),
        ("notice3", 10, 10, 0, 0, 9, 10, 16.4, 117.82),
        ("notice4", 11, 11, 0, 0, 11, 11, 19.3, 75.91),
        ("notice5", 9, 8, 1, 1, 9, 9, 14.2, 76.15),
        ("notice6", 9, 5, 0, 0, 8, 5, 11.2, 63.97),
        ("notice7", 15, 14, 1, 1, 14, 14, 18.4, 145.46),
        ("notice8", 10, 10, 0, 0, 10, 10, 8.5, 47.54),
        ("notice9", 13, 13, 1, 1, 11, 13, 14.9, 231.72),
        ("notice10", 16, 16, 1, 1, 14, 16, 22.0, 171.75),
    ],
    "Instruction": [
        ("inst1", 15, 14, 1, 1, 12, 13, 24.2, 238.53),
        ("inst2", 17, 17, 2, 2, 16, 17, 28.8, 107.70),
        ("inst3", 18, 18, 5, 5, 13, 18, 15.4, 83.98),
        ("inst4", 18, 18, 2, 2, 18, 18, 20.4, 153.55),
        ("inst5", 16, 13, 8, 8, 15, 13, 21.9, 216.40),
        ("inst6", 12, 12, 1, 1, 11, 12, 17.2, 213.62),
        ("inst7", 22, 22, 0, 0, 22, 22, 14.7, 164.28),
        ("inst8", 16, 14, 7, 7, 16, 14, 16.1, 402.64),
        ("inst9", 17, 17, 3, 3, 17, 17, 19.1, 233.45),
        ("inst10", 15, 15, 4, 4, 15, 15, 55.0, 393.89),
    ],
    "Goods": [
        ("good1", 17, 17, 4, 4, 17, 17, 15.2, 156.28),
        ("good2", 16, 16, 3, 3, 16, 16, 10.6, 148.62),
        ("good3", 16, 16, 5, 5, 15, 16, 18.7, 166.66),
        ("good4", 11, 11, 13, 11, 10, 10, 15.3, 159.15),
        ("good5", 15, 14, 19, 16, 15, 14, 21.2, 165.35),
        ("good6", 16, 16, 15, 13, 16, 16, 18.2, 211.26),
        ("good7", 18, 18, 4, 4, 18, 18, 23.2, 61.71),
        ("good8", 15, 15, 5, 5, 14, 15, 19.9, 122.48),
        ("good9", 22, 21, 13, 12, 22, 22, 19.8, 138.44),
        ("good10", 17, 17, 4, 4, 16, 17, 21.8, 119.97),
    ],
    "Poster": [
        ("poster1", 12, 9, 8, 4, 11, 9, 25.3, 214.85),
        ("poster2", 7, 7, 3, 3, 7, 7, 13.4, 235.03),
        ("poster3", 15, 15, 4, 4, 15, 15, 17.5, 287.41),
        ("poster4", 23, 22, 32, 30, 21, 21, 18.5, 336.25),
        ("poster5", 14, 14, 4, 4, 14, 14, 13.2, 268.41),
        ("poster6", 21, 21, 6, 6, 21, 21, 15.5, 323.59),
        ("poster7", 16, 13, 3, 3, 16, 14, 30.9, 219.68),
        ("poster8", 16, 14, 3, 3, 16, 14, 22.5, 316.09),
        ("poster9", 13, 13, 1, 1, 12, 13, 38.5, 347.26),
        ("poster10", 15, 15, 4, 4, 15, 15, 18.1, 111.82),
    ],
}


def ensure_output_dir():
    output_dir = Path(__file__).resolve().parents[1] / "docs" / "chapter8_figures"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def build_menu_df():
    columns = [
        "sample",
        "recognized_blocks",
        "manual_valid_blocks",
        "recognized_valid_blocks",
        "correct_translated_valid_blocks",
        "manual_noise_blocks",
        "correct_filtered_noise_blocks",
        "correct_bbox_count",
        "correct_card_count",
        "time_s",
        "file_size_kb",
    ]
    df = pd.DataFrame(MENU_DATA, columns=columns)
    df["valid_text_recognition_rate"] = (
        df["correct_translated_valid_blocks"] / df["manual_valid_blocks"]
    )
    df["noise_filter_accuracy"] = (
        df["correct_filtered_noise_blocks"] / df["manual_noise_blocks"]
    )
    df["bbox_accuracy"] = df["correct_bbox_count"] / df["correct_translated_valid_blocks"]
    df["card_accuracy"] = df["correct_card_count"] / df["correct_translated_valid_blocks"]
    df["scene"] = "Menu"
    return df


def build_long_text_df():
    rows = []
    for scene, items in LONG_TEXT_DATA.items():
        for item in items:
            rows.append((scene, *item))

    columns = [
        "scene",
        "sample",
        "recognized_keywords",
        "correct_keywords",
        "manual_noise_blocks",
        "correct_filtered_noise_blocks",
        "correct_bbox_count",
        "correct_card_count",
        "time_s",
        "file_size_kb",
    ]
    df = pd.DataFrame(rows, columns=columns)
    df["keyword_accuracy"] = df["correct_keywords"] / df["recognized_keywords"]
    noise_denominator = df["manual_noise_blocks"].where(
        df["manual_noise_blocks"] != 0,
        other=float("nan"),
    )
    df["noise_filter_accuracy"] = df["correct_filtered_noise_blocks"] / noise_denominator
    df["bbox_accuracy"] = df["correct_bbox_count"] / df["recognized_keywords"]
    df["card_accuracy"] = df["correct_card_count"] / df["recognized_keywords"]
    return df


def plot_menu_metrics(menu_df, output_dir):
    metric_map = {
        "Valid Text Recognition": menu_df["valid_text_recognition_rate"].mean() * 100,
        "Noise Filter Accuracy": menu_df["noise_filter_accuracy"].mean() * 100,
        "BBox Accuracy": menu_df["bbox_accuracy"].mean() * 100,
        "Card Accuracy": menu_df["card_accuracy"].mean() * 100,
    }

    fig, ax = plt.subplots(figsize=(9, 5.5))
    bars = ax.bar(
        metric_map.keys(),
        metric_map.values(),
        color=["#2563eb", "#0f766e", "#d97706", "#7c3aed"],
    )
    ax.set_ylim(0, 110)
    ax.set_ylabel("Average percentage (%)")
    ax.set_title("Menu Scenario Core Metrics")
    ax.grid(axis="y", linestyle="--", alpha=0.25)
    ax.set_axisbelow(True)

    for bar, value in zip(bars, metric_map.values()):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            value + 1.5,
            f"{value:.1f}%",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
        )

    fig.tight_layout()
    fig.savefig(output_dir / "fig8_menu_core_metrics.png", dpi=220)
    plt.close(fig)


def plot_long_text_metrics(long_df, output_dir):
    summary = (
        long_df.groupby("scene")[["keyword_accuracy", "bbox_accuracy", "card_accuracy"]]
        .mean()
        .mul(100)
        .reset_index()
    )

    fig, ax = plt.subplots(figsize=(10, 5.8))
    scenes = summary["scene"].tolist()
    x = range(len(scenes))
    width = 0.23

    metrics = [
        ("keyword_accuracy", "Keyword Accuracy", "#2563eb", -width),
        ("bbox_accuracy", "BBox Accuracy", "#0f766e", 0),
        ("card_accuracy", "Card Accuracy", "#d97706", width),
    ]

    for metric_key, label, color, offset in metrics:
        bars = ax.bar(
            [value + offset for value in x],
            summary[metric_key],
            width=width,
            label=label,
            color=color,
        )
        for bar, value in zip(bars, summary[metric_key]):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + 1.2,
                f"{value:.1f}",
                ha="center",
                va="bottom",
                fontsize=9,
            )

    ax.set_xticks(list(x))
    ax.set_xticklabels(scenes)
    ax.set_ylim(0, 110)
    ax.set_ylabel("Average percentage (%)")
    ax.set_title("Long-Text Scene Core Metrics")
    ax.legend(frameon=False, ncol=3, loc="upper center")
    ax.grid(axis="y", linestyle="--", alpha=0.25)
    ax.set_axisbelow(True)

    fig.tight_layout()
    fig.savefig(output_dir / "fig8_long_text_core_metrics.png", dpi=220)
    plt.close(fig)


def plot_average_time(menu_df, long_df, output_dir):
    scene_time = (
        pd.concat(
            [
                menu_df[["scene", "time_s"]],
                long_df[["scene", "time_s"]],
            ],
            ignore_index=True,
        )
        .groupby("scene")["time_s"]
        .mean()
        .reindex(["Menu", "Notice", "Instruction", "Goods", "Poster"])
    )

    fig, ax = plt.subplots(figsize=(9.5, 5.5))
    bars = ax.bar(
        scene_time.index,
        scene_time.values,
        color=["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626"],
    )
    ax.set_ylabel("Average processing time (s)")
    ax.set_title("Average Processing Time by Scene")
    ax.grid(axis="y", linestyle="--", alpha=0.25)
    ax.set_axisbelow(True)

    for bar, value in zip(bars, scene_time.values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.45,
            f"{value:.1f}s",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
        )

    fig.tight_layout()
    fig.savefig(output_dir / "fig8_average_processing_time.png", dpi=220)
    plt.close(fig)


def plot_file_size_vs_time(menu_df, long_df, output_dir):
    combined = pd.concat(
        [
            menu_df[["scene", "file_size_kb", "time_s"]],
            long_df[["scene", "file_size_kb", "time_s"]],
        ],
        ignore_index=True,
    )

    color_map = {
        "Menu": "#2563eb",
        "Notice": "#0f766e",
        "Instruction": "#d97706",
        "Goods": "#7c3aed",
        "Poster": "#dc2626",
    }

    fig, ax = plt.subplots(figsize=(9.5, 5.8))
    for scene, scene_df in combined.groupby("scene"):
        ax.scatter(
            scene_df["file_size_kb"],
            scene_df["time_s"],
            label=scene,
            s=55,
            alpha=0.8,
            color=color_map.get(scene, "#334155"),
        )

    ax.set_xlabel("File size (KB)")
    ax.set_ylabel("Processing time (s)")
    ax.set_title("File Size vs Processing Time")
    ax.grid(linestyle="--", alpha=0.25)
    ax.legend(frameon=False)

    fig.tight_layout()
    fig.savefig(output_dir / "fig8_file_size_vs_time.png", dpi=220)
    plt.close(fig)


def write_summary_tables(menu_df, long_df, output_dir):
    menu_summary = pd.DataFrame(
        {
            "scene": ["Menu"],
            "valid_text_recognition_rate_pct": [
                menu_df["valid_text_recognition_rate"].mean() * 100
            ],
            "noise_filter_accuracy_pct": [
                menu_df["noise_filter_accuracy"].mean() * 100
            ],
            "bbox_accuracy_pct": [menu_df["bbox_accuracy"].mean() * 100],
            "card_accuracy_pct": [menu_df["card_accuracy"].mean() * 100],
            "average_time_s": [menu_df["time_s"].mean()],
            "average_file_size_kb": [menu_df["file_size_kb"].mean()],
        }
    )

    long_summary = (
        long_df.groupby("scene")[
            ["keyword_accuracy", "bbox_accuracy", "card_accuracy", "time_s", "file_size_kb"]
        ]
        .mean()
        .reset_index()
        .rename(
            columns={
                "keyword_accuracy": "keyword_accuracy_pct",
                "bbox_accuracy": "bbox_accuracy_pct",
                "card_accuracy": "card_accuracy_pct",
                "time_s": "average_time_s",
                "file_size_kb": "average_file_size_kb",
            }
        )
    )
    long_summary["keyword_accuracy_pct"] *= 100
    long_summary["bbox_accuracy_pct"] *= 100
    long_summary["card_accuracy_pct"] *= 100

    with pd.ExcelWriter(output_dir / "chapter8_metric_summary.xlsx") as writer:
        menu_summary.to_excel(writer, sheet_name="menu_summary", index=False)
        long_summary.to_excel(writer, sheet_name="long_text_summary", index=False)
        menu_df.to_excel(writer, sheet_name="menu_raw", index=False)
        long_df.to_excel(writer, sheet_name="long_text_raw", index=False)


def main():
    output_dir = ensure_output_dir()
    menu_df = build_menu_df()
    long_df = build_long_text_df()

    plot_menu_metrics(menu_df, output_dir)
    plot_long_text_metrics(long_df, output_dir)
    plot_average_time(menu_df, long_df, output_dir)
    plot_file_size_vs_time(menu_df, long_df, output_dir)
    write_summary_tables(menu_df, long_df, output_dir)

    print(f"Figures and summary tables generated in: {output_dir}")


if __name__ == "__main__":
    main()
