"""KML and GPX export utilities."""

from html import escape

from app.schemas.location import LocationFeatureCollection


def _xml_text(value: str) -> str:
    """Escape XML special characters for text nodes."""
    return escape(value, quote=False)


def _xml_attr(value: str) -> str:
    """Escape XML special characters for attribute values."""
    return escape(value, quote=True)


def _build_description_lines(feature) -> list[str]:
    """Build common human-readable description lines for exports."""
    props = feature.properties
    lines: list[str] = []
    if props.city:
        lines.append(f"City: {props.city}")
    if props.country:
        lines.append(f"Country: {props.country}")
    if props.type:
        lines.append(f"Type: {props.type.name}")
    if props.years_visited:
        lines.append(f"Visited: {', '.join(str(y) for y in props.years_visited)}")
    if props.visited_unknown_year and not props.years_visited:
        lines.append("Visited: (year unknown)")
    if props.rating is not None:
        lines.append(f"Rating: {props.rating}/5")
    if props.comments:
        lines.append(f"Notes: {props.comments}")
    if props.link:
        lines.append(f"Link: {props.link}")
    return lines


def locations_to_kml(collection: LocationFeatureCollection) -> str:
    """Convert a LocationFeatureCollection to a KML XML string."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        "  <Document>",
        "    <name>Locations</name>",
    ]

    for feature in collection.features:
        props = feature.properties
        lon, lat = feature.geometry.coordinates

        lines.append("    <Placemark>")
        lines.append(f"      <name>{_xml_text(props.name)}</name>")

        description_lines = _build_description_lines(feature)
        if description_lines:
            description_text = _xml_text(chr(10).join(description_lines))
            lines.append(f"      <description>{description_text}</description>")

        lines.append("      <Point>")
        lines.append(f"        <coordinates>{lon},{lat},0</coordinates>")
        lines.append("      </Point>")
        lines.append("    </Placemark>")

    lines.append("  </Document>")
    lines.append("</kml>")
    return "\n".join(lines)


def locations_to_gpx(collection: LocationFeatureCollection) -> str:
    """Convert a LocationFeatureCollection to a GPX XML string."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="Activiteiten" '
        'xmlns="http://www.topografix.com/GPX/1/1" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 '
        'http://www.topografix.com/GPX/1/1/gpx.xsd">',
    ]

    for feature in collection.features:
        props = feature.properties
        lon, lat = feature.geometry.coordinates

        lines.append(f'  <wpt lat="{_xml_attr(str(lat))}" lon="{_xml_attr(str(lon))}">')
        lines.append(f"    <name>{_xml_text(props.name)}</name>")

        description_lines = _build_description_lines(feature)
        if description_lines:
            lines.append(
                f"    <desc>{_xml_text(chr(10).join(description_lines))}</desc>"
            )

        if props.comments:
            lines.append(f"    <cmt>{_xml_text(props.comments)}</cmt>")

        if props.link:
            lines.append(f'    <link href="{_xml_attr(props.link)}">')
            lines.append(f"      <text>{_xml_text(props.name)}</text>")
            lines.append("    </link>")

        if props.type:
            lines.append(f"    <type>{_xml_text(props.type.name)}</type>")

        lines.append("  </wpt>")

    lines.append("</gpx>")
    return "\n".join(lines)
