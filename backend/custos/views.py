# backend/custos/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.db.models import Sum, Count
from django.db.models.functions import ExtractMonth, ExtractYear, ExtractDay
from datetime import datetime
import pandas as pd

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
import numpy as np # Importante para lidar com NaN de forma rápida
from .models import ResponsavelCusto, Transacao
from .serializers import ResponsavelSerializer, TransacaoSerializer


class ResumoMensalView(APIView):
    permission_classes = [IsAuthenticated]
    """
    Endpoint otimizado que retorna dados agregados por mês e setor.
    Evita enviar milhares de transações para o frontend.
    
    Query params:
        ano: Ano para filtrar (obrigatório)
    
    Retorna:
        {
            "por_mes": [{"mes": 1, "total": 150000}, ...],
            "por_setor_mes": [{"mes": 1, "setor": "Nome", "total": 50000}, ...],
            "totais": {"ano": 2025, "total_ano": 1800000, "meses_com_dados": [1, 2, 3, ...]}
        }
    """
    
    def get(self, request):
        ano = request.query_params.get('ano')
        
        if not ano:
            ano = datetime.now().year
        else:
            ano = int(ano)
        
        # Filtro base: ano selecionado (inclui positivos e negativos/estornos)
        queryset = Transacao.objects.filter(
            data__year=ano
        )
        
        # 1. Total por mês
        por_mes = queryset.annotate(
            mes=ExtractMonth('data')
        ).values('mes').annotate(
            total=Sum('valor')
        ).order_by('mes')
        
        # 2. Total por setor e mês
        por_setor_mes = queryset.annotate(
            mes=ExtractMonth('data')
        ).values('mes', 'responsavel__nome').annotate(
            total=Sum('valor')
        ).order_by('mes', '-total')
        
        # 3. Totais gerais
        total_ano = queryset.aggregate(total=Sum('valor'))['total'] or 0
        meses_com_dados = list(queryset.annotate(
            mes=ExtractMonth('data')
        ).values_list('mes', flat=True).distinct().order_by('mes'))
        
        return Response({
            "por_mes": list(por_mes),
            "por_setor_mes": [
                {"mes": item['mes'], "setor": item['responsavel__nome'], "total": float(item['total'])}
                for item in por_setor_mes
            ],
            "totais": {
                "ano": ano,
                "total_ano": float(total_ano),
                "meses_com_dados": meses_com_dados
            }
        })


class DetalhesSetorView(APIView):
    """
    Endpoint para drill-down: retorna detalhes de um setor específico.
    Agrupa transações por descrição de conta.
    
    Query params:
        ano: Ano para filtrar
        setor: Nome do setor/responsável
    
    Retorna:
        [{"descricao": "Nome da Conta", "total": 50000, "count": 15}, ...]
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        ano = request.query_params.get('ano')
        setor = request.query_params.get('setor')
        
        if not ano or not setor:
            return Response({"error": "Parâmetros 'ano' e 'setor' são obrigatórios"}, status=400)
        
        ano = int(ano)
        
        # Busca transações do setor no ano (inclui estornos)
        queryset = Transacao.objects.filter(
            data__year=ano,
            responsavel__nome=setor
        )
        
        # Agrupa por descrição de conta
        por_descricao = queryset.values('descricao_conta').annotate(
            total=Sum('valor'),
            count=Count('id')
        ).order_by('-total')
        
        return Response([
            {
                "descricao": item['descricao_conta'] or 'Outros',
                "total": float(item['total']),
                "count": item['count']
            }
            for item in por_descricao
        ])


class ResumoDiarioView(APIView):
    """
    Endpoint para análise mensal dia a dia.
    
    Query params:
        ano: Ano 
        mes: Mês (1-12)
    
    Retorna:
        {
            "por_dia": [{"dia": 1, "total": 5000}, ...],
            "por_setor": [{"setor": "Nome", "total": 50000}, ...],
            "totais": {"mes": 1, "ano": 2025, "total_mes": 150000, "dias_com_dados": [1, 2, 3, ...]}
        }
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        ano = request.query_params.get('ano')
        mes = request.query_params.get('mes')
        
        if not ano or not mes:
            return Response({"error": "Parâmetros 'ano' e 'mes' são obrigatórios"}, status=400)
        
        ano = int(ano)
        mes = int(mes)
        
        from django.db.models.functions import ExtractDay
        
        # Filtro base: mês e ano selecionados (inclui estornos)
        queryset = Transacao.objects.filter(
            data__year=ano,
            data__month=mes
        )
        
        # 1. Total por dia
        por_dia = queryset.annotate(
            dia=ExtractDay('data')
        ).values('dia').annotate(
            total=Sum('valor')
        ).order_by('dia')
        
        # 2. Total por setor (top 10)
        por_setor = queryset.values('responsavel__nome').annotate(
            total=Sum('valor')
        ).order_by('-total')[:10]
        
        # 3. Totais e dias com dados
        total_mes = queryset.aggregate(total=Sum('valor'))['total'] or 0
        dias_com_dados = list(queryset.annotate(
            dia=ExtractDay('data')
        ).values_list('dia', flat=True).distinct().order_by('dia'))
        
        return Response({
            "por_dia": [
                {"dia": item['dia'], "total": float(item['total'])}
                for item in por_dia
            ],
            "por_setor": [
                {"setor": item['responsavel__nome'], "total": float(item['total'])}
                for item in por_setor
            ],
            "totais": {
                "mes": mes,
                "ano": ano,
                "total_mes": float(total_mes),
                "dias_com_dados": dias_com_dados
            }
        })


class ResumoFornecedoresView(APIView):
    """
    Retorna resumo de gastos por fornecedor
    GET /api/resumo-fornecedores/?ano=2025
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ano = request.query_params.get('ano', datetime.now().year)
        
        queryset = Transacao.objects.filter(
            data__year=ano,
            fornecedor__isnull=False
        ).exclude(fornecedor='')
        
        # Top fornecedores
        por_fornecedor = queryset.values('fornecedor').annotate(
            total=Sum('valor'),
            transacoes=Count('id')
        ).order_by('-total')[:50]
        
        # Por setor para cada fornecedor (top 10 fornecedores)
        top_10_fornecedores = [f['fornecedor'] for f in por_fornecedor[:10]]
        
        por_setor = {}
        for fornecedor in top_10_fornecedores:
            setores = queryset.filter(fornecedor=fornecedor).values(
                'responsavel__nome'
            ).annotate(
                total=Sum('valor')
            ).order_by('-total')[:5]
            por_setor[fornecedor] = [
                {'setor': s['responsavel__nome'], 'total': float(s['total'])}
                for s in setores
            ]
        
        # Evolução mensal (top 5 fornecedores)
        evolucao = {}
        top_5 = top_10_fornecedores[:5]
        for fornecedor in top_5:
            meses = queryset.filter(fornecedor=fornecedor).annotate(
                mes=ExtractMonth('data')
            ).values('mes').annotate(
                total=Sum('valor')
            ).order_by('mes')
            evolucao[fornecedor] = {m['mes']: float(m['total']) for m in meses}
        
        # Total geral
        total_ano = queryset.aggregate(total=Sum('valor'))['total'] or 0
        
        return Response({
            "por_fornecedor": [
                {
                    'fornecedor': f['fornecedor'],
                    'total': float(f['total']),
                    'transacoes': f['transacoes']
                }
                for f in por_fornecedor
            ],
            "por_setor": por_setor,
            "evolucao_mensal": evolucao,
            "total_ano": float(total_ano),
            "ano": int(ano)
        })


class ResumoGeralView(APIView):
    """
    Retorna resumo de setores e fornecedores com filtro de período
    GET /api/resumo-geral/?periodo=mes&ano=2025&mes=1
    GET /api/resumo-geral/?periodo=mes&ano=2025&mes=1
    periodo: 'tudo', 'ano', 'mes', 'semana'
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        
        periodo = request.query_params.get('periodo', 'mes')
        ano = int(request.query_params.get('ano', datetime.now().year))
        mes = int(request.query_params.get('mes', datetime.now().month))
        semana = request.query_params.get('semana') # Semana ISO 1-52 ou 53
        
        # Definir filtros de data baseado no período
        
        if periodo == 'tudo':
            queryset = Transacao.objects.all()
        elif periodo == 'ano':
            queryset = Transacao.objects.filter(data__year=ano)
        elif periodo == 'mes':
            queryset = Transacao.objects.filter(data__year=ano, data__month=mes)
        elif periodo == 'semana':
            # Se não passar semana, usa a atual
            if not semana:
                hoje = datetime.now().date()
                semana = hoje.isocalendar()[1]
            
            semana = int(semana)
            
            # Calcular start/end da semana ISO
            # fromisocalendar(year, week, day) -> day 1 = segunda-feira
            inicio_semana = datetime.fromisocalendar(ano, semana, 1)
            fim_semana = datetime.fromisocalendar(ano, semana, 7) # Domingo
            
            # Ajuste para datetime (com hora) se necessário, mas o Django lida bem com date em range se o campo for date
            # Se o campo data for DateTimeField, talvez precise ajustar o fim para 23:59:59
            # Assumindo que data é DateField ou que o filtro range funciona (normalmente funciona)
            queryset = Transacao.objects.filter(data__range=[inicio_semana, fim_semana])
        else:
            queryset = Transacao.objects.filter(data__year=ano, data__month=mes)
        
        # Top Setores
        top_setores = queryset.values('responsavel__nome').annotate(
            total=Sum('valor')
        ).order_by('-total')[:15]
        
        # Top Fornecedores
        top_fornecedores = queryset.filter(
            fornecedor__isnull=False
        ).exclude(fornecedor='').values('fornecedor').annotate(
            total=Sum('valor')
        ).order_by('-total')[:15]
        
        # Totais
        total_geral = queryset.aggregate(total=Sum('valor'))['total'] or 0
        
        return Response({
            "top_setores": [
                {'nome': s['responsavel__nome'], 'total': float(s['total'])}
                for s in top_setores
            ],
            "top_fornecedores": [
                {'nome': f['fornecedor'], 'total': float(f['total'])}
                for f in top_fornecedores
            ],
            "total_geral": float(total_geral),
            "periodo": periodo,
            "ano": ano,
            "mes": mes
        })


class ResponsavelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ResponsavelCusto.objects.all()
    serializer_class = ResponsavelSerializer

class TransacaoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    # Mantemos o select_related para performance
    queryset = Transacao.objects.select_related('responsavel').all()
    serializer_class = TransacaoSerializer

    def get_queryset(self):
        """
        Sobrescreve a busca padrão para permitir filtros via URL
        """
        # Pega a queryset base (todas as transações)
        queryset = super().get_queryset()

        # Tenta pegar os parâmetros da URL
        data_inicio = self.request.query_params.get('inicio')
        data_fim = self.request.query_params.get('fim')

        # Se o usuário mandou as datas, aplica o filtro SQL
        if data_inicio and data_fim:
            try:
                # O formato esperado é YYYY-MM-DD
                queryset = queryset.filter(data__range=[data_inicio, data_fim])
            except ValueError:
                pass # Se a data vier errada, ignora e retorna tudo

        return queryset


class DashboardResumoView(APIView):
    """
    Retorna dados agregados para o Dashboard (Otimizado)
    Retorna dados agregados para o Dashboard (Otimizado)
    GET /api/dashboard-resumo/?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data_inicio = request.query_params.get('inicio')
        data_fim = request.query_params.get('fim')
        
        queryset = Transacao.objects.all()
        
        if data_inicio and data_fim:
            try:
                queryset = queryset.filter(data__range=[data_inicio, data_fim])
            except ValueError:
                pass

        # 1. Total Geral
        total_gasto = queryset.aggregate(total=Sum('valor'))['total'] or 0
        
        # 2. Resumo por Setor (Pizza)
        resumo_setor = queryset.values('responsavel__nome').annotate(
            total=Sum('valor')
        ).order_by('-total')
        
        # 3. Resumo por Tempo (Gráfico de Área)
        # Agrupa por mês/ano. Note que isso depende do banco.
        # SQLite/Postgres suportam ExtractYear/Month.
        resumo_tempo = queryset.annotate(
            mes=ExtractMonth('data'),
            ano=ExtractYear('data')
        ).values('ano', 'mes').annotate(
            total=Sum('valor')
        ).order_by('ano', 'mes')
        
        # Formatar dados de tempo para o frontend "Mes/Ano"
        # O frontend espera algo como { nome: "Jan/2024", total: 1000 }
        meses_nome = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        chart_data = []
        
        for item in resumo_tempo:
            mes_idx = item['mes'] - 1 # 1-based to 0-based
            nome_mes = f"{meses_nome[mes_idx]}/{item['ano']}"
            chart_data.append({
                'nome': nome_mes,
                'total': float(item['total'])
            })
            
        return Response({
            "total_gasto": float(total_gasto),
            "resumo_setor": [
                {
                    'responsavel_nome': s['responsavel__nome'] or 'Outros',
                    'total': float(s['total'])
                }
                for s in resumo_setor
            ],
            "resumo_tempo": chart_data
        })

class UploadExcelView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        
        if not file_obj:
            return Response({"error": "Nenhum arquivo enviado"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Leitura rápida
            # Se for CSV muito grande, use chunks, mas para 60k o pandas aguenta na RAM tranquilo
            if file_obj.name.endswith('.csv'):
                df = pd.read_csv(file_obj)
            else:
                df = pd.read_excel(file_obj)
            
            df.columns = df.columns.str.strip()
            
            # Validação
            if 'MA' not in df.columns or 'AMOUNTMST' not in df.columns:
                 return Response({"error": "Colunas MA ou AMOUNTMST não encontradas"}, status=status.HTTP_400_BAD_REQUEST)

            # Limpeza prévia de dados (Vectorized operations são mil vezes mais rápidas que loops)
            # Remove linhas onde MA é vazio ou NaN
            df = df.dropna(subset=['MA'])
            df = df[df['MA'].astype(str).str.strip() != '']

            total_linhas = len(df)
            objetos_transacao = []

            with transaction.atomic():
                # --- PASSO 1: OTIMIZAÇÃO DOS RESPONSÁVEIS (FOREIGN KEY) ---
                # Em vez de buscar no banco 60.000 vezes, vamos buscar 1 vez.
                
                # Pega todos os nomes únicos de MA do Excel
                nomes_unicos_excel = df['MA'].astype(str).str.strip().unique()
                
                # Busca os que já existem no banco
                existentes = ResponsavelCusto.objects.filter(nome__in=nomes_unicos_excel)
                mapa_responsaveis = {r.nome: r for r in existentes} # Dicionário {Nome: Objeto}
                
                # Identifica quais são novos e precisam ser criados
                nomes_existentes = set(mapa_responsaveis.keys())
                novos_para_criar = [
                    ResponsavelCusto(nome=nome) 
                    for nome in nomes_unicos_excel 
                    if nome not in nomes_existentes
                ]
                
                # Cria os novos em lote (1 query só)
                if novos_para_criar:
                    ResponsavelCusto.objects.bulk_create(novos_para_criar)
                    # Atualiza o mapa com os recém criados
                    novos_objetos = ResponsavelCusto.objects.filter(nome__in=[n.nome for n in novos_para_criar])
                    mapa_responsaveis.update({r.nome: r for r in novos_objetos})

                # --- PASSO 2: PREPARAÇÃO DAS TRANSAÇÕES NA MEMÓRIA ---
                # Agora transformamos o DataFrame em dicionários (muito mais rápido que iterrows)
                records = df.to_dict('records')
                
                for row in records:
                    nome_ma = str(row['MA']).strip()
                    responsavel_obj = mapa_responsaveis.get(nome_ma)
                    
                    if not responsavel_obj:
                        continue # Segurança extra

                    # AQUI É O PULO DO GATO:
                    # Não damos .save() nem .create(). Apenas instanciamos na memória.
                    objetos_transacao.append(
                        Transacao(
                            responsavel=responsavel_obj,
                            data=row['TRANSDATE'],
                            valor=row['AMOUNTMST'],
                            descricao_conta=str(row['Descrição Conta']),
                            txt_detalhe=str(row['TXT']) if 'TXT' in df.columns else '',
                            fornecedor=str(row['Fornecedor']).strip() if 'Fornecedor' in df.columns and pd.notna(row.get('Fornecedor')) else None,
                            arquivo_origem=file_obj.name
                        )
                    )

                # --- PASSO 3: O GRANDE DISPARO (BULK INSERT) ---
                # O Django divide automaticamente em lotes se for muito grande, mas vamos forçar batch_size
                # Isso manda comandos SQL de 2000 em 2000 linhas.
                Transacao.objects.bulk_create(objetos_transacao, batch_size=2000)

            return Response({"message": f"Sucesso! {len(objetos_transacao)} linhas importadas em segundos."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Importante: logar o erro no console para você ver o que houve
            print(f"Erro no upload: {e}") 
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)