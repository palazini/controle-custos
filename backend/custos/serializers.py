from rest_framework import serializers
from .models import ResponsavelCusto, Transacao, FornecedorConfig

class ResponsavelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponsavelCusto
        fields = '__all__'

class TransacaoSerializer(serializers.ModelSerializer):
    # Traz o nome do responsável em vez de apenas o ID (útil pro frontend)
    responsavel_nome = serializers.CharField(source='responsavel.nome', read_only=True)

    class Meta:
        model = Transacao
        fields = '__all__'


class FornecedorConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FornecedorConfig
        fields = '__all__'