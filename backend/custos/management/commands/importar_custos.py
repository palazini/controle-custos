import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from custos.models import ResponsavelCusto, Transacao
import os

class Command(BaseCommand):
    help = 'Importa dados da planilha de custos para o banco de dados'

    def add_arguments(self, parser):
        parser.add_argument('caminho_arquivo', type=str, help='Caminho completo para o arquivo Excel')

    def handle(self, *args, **options):
        caminho = options['caminho_arquivo']

        if not os.path.exists(caminho):
            self.stdout.write(self.style.ERROR(f'Arquivo não encontrado: {caminho}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Lendo arquivo: {caminho}...'))

        try:
            # Lê o Excel (Assume que os dados estão na primeira aba)
            df = pd.read_excel(caminho)
            
            # Limpeza básica nos nomes das colunas (remove espaços extras tipo "MA ")
            df.columns = df.columns.str.strip()

            # Verifica se as colunas essenciais existem
            colunas_necessarias = ['MA', 'TRANSDATE', 'AMOUNTMST', 'Descrição Conta']
            for col in colunas_necessarias:
                if col not in df.columns:
                    self.stdout.write(self.style.ERROR(f'Coluna obrigatória não encontrada no Excel: "{col}"'))
                    self.stdout.write(f'Colunas encontradas: {list(df.columns)}')
                    return

            total_importado = 0
            
            # Bloco atômico: ou salva tudo ou não salva nada (segurança)
            with transaction.atomic():
                for index, row in df.iterrows():
                    # 1. Identifica ou Cria o Responsável (Coluna L - MA)
                    nome_responsavel = str(row['MA']).strip()
                    
                    # Pula linhas onde o MA é vazio ou NaN
                    if not nome_responsavel or nome_responsavel.lower() == 'nan':
                        continue

                    responsavel, created = ResponsavelCusto.objects.get_or_create(
                        nome=nome_responsavel
                    )

                    # 2. Cria a Transação
                    Transacao.objects.create(
                        responsavel=responsavel,
                        data=row['TRANSDATE'],
                        valor=row['AMOUNTMST'],
                        descricao_conta=str(row['Descrição Conta']),
                        txt_detalhe=str(row['TXT']) if 'TXT' in df.columns else '',
                        arquivo_origem=os.path.basename(caminho)
                    )
                    total_importado += 1

            self.stdout.write(self.style.SUCCESS(f'Sucesso! {total_importado} linhas importadas.'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao importar: {str(e)}'))