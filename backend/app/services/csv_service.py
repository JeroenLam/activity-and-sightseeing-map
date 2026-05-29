import csv
import io
from typing import Any


KNOWN_COLUMNS = {
    "name": ["name", "naam", "title", "titel"],
    "type": ["type", "soort", "category", "categorie"],
    "city": ["city", "stad", "plaats", "place"],
    "country": ["country", "land", "country_code"],
    "link": ["link", "url", "website"],
    "visited": ["visited", "bezocht", "years", "jaren", "year", "jaar"],
}


def detect_column_map(headers: list[str]) -> dict[str, str]:
    """Auto-detect column mapping from CSV headers."""
    column_map: dict[str, str] = {}
    lower_headers = [h.lower().strip() for h in headers]

    for field, aliases in KNOWN_COLUMNS.items():
        for alias in aliases:
            if alias in lower_headers:
                idx = lower_headers.index(alias)
                column_map[field] = headers[idx]
                break

    return column_map


def parse_csv(csv_text: str) -> tuple[list[str], list[dict[str, str]]]:
    """Parse CSV text into headers and rows."""
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = reader.fieldnames or []
    rows = list(reader)
    return list(headers), rows


def parse_visited_years(value: str) -> tuple[list[int], bool]:
    """Parse visited years from a CSV cell value.

    Returns (years_list, visited_unknown_year).
    """
    if not value or value.strip() == "":
        return [], False

    value = value.strip()
    if value == "-":
        return [], True

    years: list[int] = []
    unknown = False

    for part in value.replace(";", ",").split(","):
        part = part.strip()
        if not part:
            continue
        if part == "-":
            unknown = True
        else:
            try:
                years.append(int(part))
            except ValueError:
                continue

    return years, unknown


def map_csv_row(
    row: dict[str, str], column_map: dict[str, str]
) -> dict[str, Any]:
    """Map a CSV row to location fields using column mapping."""
    result: dict[str, Any] = {}

    if "name" in column_map:
        result["name"] = row.get(column_map["name"], "").strip()
    if "type" in column_map:
        result["type_name"] = row.get(column_map["type"], "").strip()
    if "city" in column_map:
        result["city"] = row.get(column_map["city"], "").strip()
    if "country" in column_map:
        result["country"] = row.get(column_map["country"], "").strip()
    if "link" in column_map:
        result["link"] = row.get(column_map["link"], "").strip() or None
    if "visited" in column_map:
        visited_str = row.get(column_map["visited"], "").strip()
        years, unknown = parse_visited_years(visited_str)
        result["years_visited"] = years
        result["visited_unknown_year"] = unknown

    return result
