from io import StringIO
from pathlib import Path

import yaml
from django.conf import settings
from django.core.management import call_command
from django.test import SimpleTestCase

COMMITTED_SCHEMA = Path(settings.BASE_DIR) / "schema.yml"


def _changed(section, generated, committed):
    names = sorted(generated.keys() | committed.keys())
    return [f"{section}: {name}" for name in names if generated.get(name) != committed.get(name)]


class SchemaTests(SimpleTestCase):
    def test_committed_schema_matches_the_code(self):
        output = StringIO()
        call_command("spectacular", stdout=output, stderr=StringIO())
        generated = yaml.safe_load(output.getvalue())
        committed = yaml.safe_load(COMMITTED_SCHEMA.read_text())
        changed = _changed("paths", generated["paths"], committed["paths"]) + _changed(
            "schemas", generated["components"]["schemas"], committed["components"]["schemas"]
        )
        self.assertTrue(
            generated == committed,
            f"api/schema.yml is out of date ({', '.join(changed) or 'metadata'}): "
            "run `make schema` and commit the result.",
        )
