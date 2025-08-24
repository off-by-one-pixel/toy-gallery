from django.contrib import admin

from . import models


class ShapeSectionsAdminInline(admin.TabularInline):
    model = models.ShapeSection


class ShapeAdmin(admin.ModelAdmin):
    inlines = (ShapeSectionsAdminInline,)


admin.site.register(models.Toy)
admin.site.register(models.Shape, ShapeAdmin)
