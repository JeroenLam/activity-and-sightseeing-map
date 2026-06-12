"""KML and GPX export utilities."""

from xml.etree import ElementTree as ET

from app.schemas.location import LocationFeatureCollection


def _indent(elem: ET.Element, level: int = 0) -> None:
    """Add pretty-print indentation (compatible with Python < 3.9)."""
    indent = "\n" + "  " * level
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = indent + "  "
        if not elem.tail or not elem.tail.strip():
            elem.tail = indent
        for child in elem:
            _indent(child, level + 1)
        if not child.tail or not child.tail.strip():  # noqa: F821
            child.tail = indent
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = indent


def locations_to_kml(collection: LocationFeatureCollection) -> str:
    """Convert a LocationFeatureCollection to a KML XML string."""
    kml = ET.Element("kml", xmlns="http://www.opengis.net/kml/2.2")
    document = ET.SubElement(kml, "Document")

    doc_name = ET.SubElement(document, "name")
    doc_name.text = "Locations"

    for feature in collection.features:
        props = feature.properties
        lon, lat = feature.geometry.coordinates

        placemark = ET.SubElement(document, "Placemark")

        pm_name = ET.SubElement(placemark, "name")
        pm_name.text = props.name

        desc_parts: list[str] = []
        if props.city:
            desc_parts.append(f"City: {props.city}")
        if props.country:
            desc_parts.append(f"Country: {props.country}")
        if props.type:
            desc_parts.append(f"Type: {props.type.name}")
        if props.years_visited:
            desc_parts.append(
                f"Visited: {', '.join(str(y) for y in props.years_visited)}"
            )
        if props.visited_unknown_year and not props.years_visited:
            desc_parts.append("Visited: (year unknown)")
        if props.rating is not None:
            desc_parts.append(f"Rating: {props.rating}/5")
        if props.comments:
            desc_parts.append(f"Notes: {props.comments}")
        if props.link:
            desc_parts.append(f"Link: {props.link}")

        if desc_parts:
            desc = ET.SubElement(placemark, "description")
            desc.text = "\n".join(desc_parts)

        point = ET.SubElement(placemark, "Point")
        coords = ET.SubElement(point, "coordinates")
        coords.text = f"{lon},{lat},0"

    _indent(kml)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(
        kml, encoding="unicode"
    )


def locations_to_gpx(collection: LocationFeatureCollection) -> str:
    """Convert a LocationFeatureCollection to a GPX XML string."""
    gpx = ET.Element(
        "gpx",
        {
            "version": "1.1",
            "creator": "Activiteiten",
            "xmlns": "http://www.topografix.com/GPX/1/1",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": (
                "http://www.topografix.com/GPX/1/1 "
                "http://www.topografix.com/GPX/1/1/gpx.xsd"
            ),
        },
    )

    for feature in collection.features:
        props = feature.properties
        lon, lat = feature.geometry.coordinates

        wpt = ET.SubElement(gpx, "wpt", {"lat": str(lat), "lon": str(lon)})

        wpt_name = ET.SubElement(wpt, "name")
        wpt_name.text = props.name

        desc_parts: list[str] = []
        if props.city:
            desc_parts.append(f"City: {props.city}")
        if props.country:
            desc_parts.append(f"Country: {props.country}")
        if props.years_visited:
            desc_parts.append(
                f"Visited: {', '.join(str(y) for y in props.years_visited)}"
            )
        if props.visited_unknown_year and not props.years_visited:
            desc_parts.append("Visited: (year unknown)")
        if props.rating is not None:
            desc_parts.append(f"Rating: {props.rating}/5")

        if desc_parts:
            desc = ET.SubElement(wpt, "desc")
            desc.text = "\n".join(desc_parts)

        if props.comments:
            cmt = ET.SubElement(wpt, "cmt")
            cmt.text = props.comments

        if props.link:
            link_el = ET.SubElement(wpt, "link", href=props.link)
            link_text = ET.SubElement(link_el, "text")
            link_text.text = props.name

        if props.type:
            wpt_type = ET.SubElement(wpt, "type")
            wpt_type.text = props.type.name

    _indent(gpx)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(
        gpx, encoding="unicode"
    )
