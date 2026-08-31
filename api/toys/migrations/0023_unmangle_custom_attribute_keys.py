import re

from django.db import migrations


def unmangle_keys(apps, schema_editor):
    Toy = apps.get_model("toys", "Toy")
    pattern = re.compile(r"_([a-z])")
    for toy in Toy.objects.exclude(custom_attributes={}):
        fixed = {
            pattern.sub(lambda m: m.group(1).upper(), key): value
            for key, value in toy.custom_attributes.items()
        }
        if fixed != toy.custom_attributes:
            toy.custom_attributes = fixed
            toy.save(update_fields=["custom_attributes"])


class Migration(migrations.Migration):

    dependencies = [
        ("toys", "0022_shapesection_color"),
    ]

    operations = [
        migrations.RunPython(unmangle_keys, reverse_code=migrations.RunPython.noop),
    ]
