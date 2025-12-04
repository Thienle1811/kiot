from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BranchViewSet, AreaViewSet, RoomClassViewSet, RoomViewSet, 
    BookingViewSet, ProductViewSet, CustomerViewSet, UserViewSet, 
    CashFlowViewSet, ReportViewSet,
    DeviceViewSet, MaintenanceLogViewSet, ActivityLogViewSet, 
    BranchSettingViewSet # <--- Import thêm BranchSettingViewSet
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
router.register(r'reports', ReportViewSet, basename='reports')

# --- API CHO THIẾT BỊ ---
router.register(r'devices', DeviceViewSet)
router.register(r'maintenance-logs', MaintenanceLogViewSet)

# --- API CHO NHẬT KÝ HOẠT ĐỘNG ---
router.register(r'activity-logs', ActivityLogViewSet)

# --- API CHO CÀI ĐẶT CẤU HÌNH (MỚI) ---
router.register(r'settings', BranchSettingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]