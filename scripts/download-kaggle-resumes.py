import argparse
from pathlib import Path

import kagglehub


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description="Descarga un dataset de Kaggle dentro de data/.")
    parser.add_argument(
        "--dataset",
        default="hadikp/resume-data-pdf",
        help="Dataset de Kaggle con formato owner/name.",
    )
    parser.add_argument(
        "--output",
        default=str(ROOT / "data" / "kaggle-resume-dataset"),
        help="Carpeta local donde se guardará el dataset.",
    )
    args = parser.parse_args()
    output = Path(args.output)
    if not output.is_absolute():
        output = ROOT / output
    output.mkdir(parents=True, exist_ok=True)

    path = kagglehub.dataset_download(args.dataset, output_dir=str(output))
    print(f"Dataset descargado en: {path}")


if __name__ == "__main__":
    main()
