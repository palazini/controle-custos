from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TransacaoViewSet, ResponsavelViewSet, UploadExcelView,
    ResumoMensalView, DetalhesSetorView, ResumoDiarioView,
    ResumoFornecedoresView, ResumoFornecedoresMensalView, DetalhesFornecedorView, TransacoesFornecedorView,
    ResumoGeralView, DashboardResumoView,
    FornecedorConfigViewSet, FornecedoresUnicosView, BulkSaveFornecedorConfigView
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'transacoes', TransacaoViewSet)
router.register(r'responsaveis', ResponsavelViewSet)
router.register(r'fornecedor-config', FornecedorConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', UploadExcelView.as_view(), name='upload-excel'),
    path('resumo-mensal/', ResumoMensalView.as_view(), name='resumo-mensal'),
    path('resumo-diario/', ResumoDiarioView.as_view(), name='resumo-diario'),
    path('detalhes-setor/', DetalhesSetorView.as_view(), name='detalhes-setor'),
    path('resumo-fornecedores/', ResumoFornecedoresView.as_view(), name='resumo-fornecedores'),
    path('resumo-fornecedores-mensal/', ResumoFornecedoresMensalView.as_view(), name='resumo-fornecedores-mensal'),
    path('detalhes-fornecedor/', DetalhesFornecedorView.as_view(), name='detalhes-fornecedor'),
    path('transacoes-fornecedor/', TransacoesFornecedorView.as_view(), name='transacoes-fornecedor'),
    path('resumo-geral/', ResumoGeralView.as_view(), name='resumo-geral'),
    path('dashboard-resumo/', DashboardResumoView.as_view(), name='dashboard-resumo'),
    path('fornecedores-unicos/', FornecedoresUnicosView.as_view(), name='fornecedores-unicos'),
    path('fornecedor-config-bulk/', BulkSaveFornecedorConfigView.as_view(), name='fornecedor-config-bulk'),
    
    # JWT Auth
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]