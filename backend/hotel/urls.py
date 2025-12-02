from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BranchViewSet, AreaViewSet, RoomClassViewSet, RoomViewSet, 
    BookingViewSet, ProductViewSet, CustomerViewSet, UserViewSet, 
    CashFlowViewSet, ReportViewSet # <--- Import ReportViewSet
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet)
router.register(r'areas', AreaViewSet)
router.register(r'room-classes', RoomClassViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'products', ProductViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'users', UserViewSet)
router.register(r'cash-flows', CashFlowViewSet)
router.register(r'reports', ReportViewSet, basename='reports') # <--- QUAN TRỌNG: Dòng này tạo link API

urlpatterns = [
    path('', include(router.urls)),
]