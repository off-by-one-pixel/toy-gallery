from rest_framework import permissions, viewsets
from . import models
from . import serializers


class ToyViewSet(viewsets.ModelViewSet):
    queryset = models.Toy.objects.all()
    serializer_class = serializers.ToySerializer
