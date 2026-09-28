from django.db import migrations


def purge_orphan_shapes(apps, schema_editor):
    Shape = apps.get_model("toys", "Shape")
    Shape.objects.filter(toy__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("toys", "0026_remove_personalrecord_achieved_at"),
    ]

    operations = [
        migrations.RunPython(purge_orphan_shapes, reverse_code=migrations.RunPython.noop),
    ]
