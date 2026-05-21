from django.contrib import admin

from . import models


class ShapeSectionsAdminInline(admin.TabularInline):
    model = models.ShapeSection


class ShapeAdmin(admin.ModelAdmin):
    inlines = (ShapeSectionsAdminInline,)


class ToySessionEntryInline(admin.TabularInline):
    model = models.ToySessionEntry
    extra = 0


class SessionAdmin(admin.ModelAdmin):
    inlines = (ToySessionEntryInline,)
    list_display = ("started_at",)
    ordering = ("-started_at",)


admin.site.register(models.Toy)
admin.site.register(models.Shape, ShapeAdmin)
admin.site.register(models.Session, SessionAdmin)
