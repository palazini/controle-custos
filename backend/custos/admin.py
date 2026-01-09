from django.contrib import admin
from .models import ResponsavelCusto, Transacao

@admin.register(ResponsavelCusto)
class ResponsavelAdmin(admin.ModelAdmin):
    list_display = ('nome', 'orcamento_mensal')
    search_fields = ('nome',)

@admin.register(Transacao)
class TransacaoAdmin(admin.ModelAdmin):
    list_display = ('data', 'responsavel', 'descricao_conta', 'valor', 'arquivo_origem')
    list_filter = ('responsavel', 'data', 'arquivo_origem')
    search_fields = ('descricao_conta', 'txt_detalhe')