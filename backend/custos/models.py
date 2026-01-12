from django.db import models

class ResponsavelCusto(models.Model):
    """
    Representa a Coluna L (MA) da planilha.
    Ex: '14. Depreciation of owned assets' ou '## CUSTO FÁBRICA ##'
    """
    nome = models.CharField(max_length=255, unique=True, verbose_name="Responsável (MA)")
    descricao = models.TextField(blank=True, null=True)
    
    # Nome de exibição personalizado (opcional)
    nome_exibicao = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nome de Exibição")
    
    # Meta de orçamento para comparação (Budget)
    orcamento_mensal = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    def __str__(self):
        return self.nome_exibicao or self.nome

class Transacao(models.Model):
    """
    Representa cada linha da planilha Excel.
    """
    responsavel = models.ForeignKey(ResponsavelCusto, on_delete=models.CASCADE, related_name='transacoes')
    
    data = models.DateField(verbose_name="Data (TRANSDATE)")  # Coluna B
    
    # Coluna K (Descrição Conta) - Onde detalha o tipo de gasto
    descricao_conta = models.CharField(max_length=255) 
    
    # Coluna D (TXT) - Detalhe técnico da operação
    txt_detalhe = models.TextField(blank=True, null=True)
    
    # Coluna E (AMOUNTMST) - O valor financeiro
    valor = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Coluna Fornecedor - Nome do fornecedor
    fornecedor = models.CharField(max_length=255, blank=True, null=True, verbose_name="Fornecedor")
    
    # Metadados para rastreabilidade
    arquivo_origem = models.CharField(max_length=255, help_text="De qual Excel veio esse dado")
    data_importacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data'] # Mostra os mais recentes primeiro

    def __str__(self):
        return f"{self.data} - R$ {self.valor} ({self.responsavel.nome})"


class FornecedorConfig(models.Model):
    """
    Configuração de exibição para fornecedores.
    Permite definir nome de exibição personalizado e visibilidade.
    """
    # Nome original do fornecedor (chave única)
    nome_original = models.CharField(max_length=255, unique=True, verbose_name="Nome Original")
    
    # Nome de exibição (opcional - se vazio, usa o original)
    nome_exibicao = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nome de Exibição")
    
    # Visibilidade nas análises
    exibir = models.BooleanField(default=True, verbose_name="Exibir nas Análises")
    
    class Meta:
        verbose_name = "Configuração de Fornecedor"
        verbose_name_plural = "Configurações de Fornecedores"
    
    def __str__(self):
        return f"{self.nome_original} → {self.nome_exibicao or 'Original'}"