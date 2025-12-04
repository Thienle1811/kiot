from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta, datetime

# --- 1. CORE SETTINGS ---
class Branch(models.Model):
    name = models.CharField(max_length=255, verbose_name="Tên chi nhánh")
    address = models.CharField(max_length=500, blank=True, null=True, verbose_name="Địa chỉ")
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Số điện thoại")
    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Area(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='areas', verbose_name="Chi nhánh")
    name = models.CharField(max_length=255, verbose_name="Tên khu vực (Tầng)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.branch.name}"

# --- 2. USERS ---
class User(AbstractUser):
    ROLE_CHOICES = (('ADMIN', 'Quản trị viên'), ('RECEPTIONIST', 'Lễ tân'), ('ACCOUNTANT', 'Kế toán'))
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RECEPTIONIST', verbose_name="Vai trò")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name="Chi nhánh")

# --- 3. ROOMS ---
class RoomClass(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='room_classes')
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    base_price_hourly = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    base_price_daily = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    base_price_overnight = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    early_checkin_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    late_checkout_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Room(models.Model):
    STATUS_CHOICES = (('AVAILABLE', 'Phòng trống'), ('OCCUPIED', 'Đang có khách'), ('DIRTY', 'Chưa dọn'), ('FIXING', 'Đang bảo trì'))
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='rooms')
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name='rooms')
    room_class = models.ForeignKey(RoomClass, on_delete=models.PROTECT, related_name='rooms')
    name = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

# --- 4. CUSTOMERS & BOOKING ---
class Customer(models.Model):
    IDENTITY_TYPE_CHOICES = (('CCCD', 'CCCD/CMND'), ('PASSPORT', 'PASSPORT'), ('DRIVER_LICENSE', 'Giấy phép lái xe'))

    full_name = models.CharField(max_length=255)
    birth_date = models.DateField(null=True, blank=True)
    identity_type = models.CharField(max_length=20, choices=IDENTITY_TYPE_CHOICES, default='CCCD')
    identity_card = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    license_plate = models.CharField(max_length=50, blank=True, null=True)
    type = models.CharField(max_length=20, default='INDIVIDUAL')
    created_at = models.DateTimeField(auto_now_add=True)
    representative = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='entourage')

    def __str__(self):
        return self.full_name

class Booking(models.Model):
    # Status: CHECKED_IN (Đang ở), COMPLETED (Xong), RESERVED (Đặt trước), CANCELLED (Hủy)
    code = models.CharField(max_length=50, unique=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='CHECKED_IN')
    total_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    
    check_in_expected = models.DateTimeField(null=True, blank=True)
    check_out_expected = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

class BookingRoom(models.Model):
    BOOKING_TYPE_CHOICES = (
        ('HOURLY', 'Theo giờ'),
        ('DAILY', 'Theo ngày'),
        ('OVERNIGHT', 'Qua đêm'),
    )
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booking_rooms')
    room = models.ForeignKey(Room, on_delete=models.PROTECT)
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPE_CHOICES, default='DAILY')
    
    check_in_actual = models.DateTimeField(null=True, blank=True)
    check_out_actual = models.DateTimeField(null=True, blank=True)
    price_snapshot = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    def __str__(self):
        return f"{self.booking.code} - {self.room.name}"

# --- 5. PRODUCTS & SERVICES ---
class Product(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    selling_price = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    stock_quantity = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name

class ServiceOrder(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='service_orders')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_price(self):
        return self.quantity * self.unit_price_snapshot

# --- 6. CASH FLOW ---
class CashFlow(models.Model):
    FLOW_TYPE_CHOICES = (('RECEIPT', 'Phiếu Thu'), ('PAYMENT', 'Phiếu Chi'))
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True) 
    flow_type = models.CharField(max_length=20, choices=FLOW_TYPE_CHOICES)
    category = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_flow_type_display()} - {self.amount}"

# --- 7. DEVICE & MAINTENANCE ---
class Device(models.Model):
    STATUS_CHOICES = (
        ('GOOD', 'Hoạt động tốt'),
        ('BROKEN', 'Hỏng/Cần sửa'),
        ('MAINTENANCE', 'Đang bảo trì'),
        ('LIQUIDATED', 'Đã thanh lý'),
    )
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='devices')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    
    name = models.CharField(max_length=255, verbose_name="Tên thiết bị")
    code = models.CharField(max_length=50, null=True, blank=True, verbose_name="Mã tài sản")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='GOOD')
    description = models.TextField(blank=True, null=True)
    
    is_maintenance_required = models.BooleanField(default=False, verbose_name="Cần bảo trì định kỳ")
    maintenance_interval_days = models.IntegerField(default=0, verbose_name="Chu kỳ (ngày)")
    last_maintenance_date = models.DateField(null=True, blank=True, verbose_name="Ngày bảo trì gần nhất")
    
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def next_maintenance_date(self):
        if self.is_maintenance_required and self.last_maintenance_date and self.maintenance_interval_days > 0:
            return self.last_maintenance_date + timedelta(days=self.maintenance_interval_days)
        return None

    def __str__(self):
        return self.name

class MaintenanceLog(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField(default=timezone.now)
    cost = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Chi phí")
    description = models.TextField(verbose_name="Nội dung công việc")
    performer = models.CharField(max_length=255, verbose_name="Người thực hiện")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device.name} - {self.date}"

# --- 8. ACTIVITY LOG ---
class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} - {self.created_at}"

# --- 9. SETTINGS (MỚI: CẤU HÌNH HỆ THỐNG) ---
class BranchSetting(models.Model):
    SURCHARGE_METHOD_CHOICES = (
        ('PERCENT', 'Theo phần trăm (%)'),
        ('FIXED', 'Theo số tiền cố định (VNĐ)'),
    )

    branch = models.OneToOneField(Branch, on_delete=models.CASCADE, related_name='settings')
    
    # 1. Cấu hình giờ chuẩn
    check_in_time = models.TimeField(default="14:00", verbose_name="Giờ nhận phòng chuẩn")
    check_out_time = models.TimeField(default="12:00", verbose_name="Giờ trả phòng chuẩn")
    
    # 2. Cấu hình phụ thu quá giờ (Check-out muộn)
    overtime_method = models.CharField(
        max_length=10, 
        choices=SURCHARGE_METHOD_CHOICES, 
        default='PERCENT',
        verbose_name="Cách tính phụ thu quá giờ"
    )
    # Lưu cả 2 giá trị để user chuyển đổi qua lại không bị mất số cũ
    overtime_percent = models.IntegerField(default=10, verbose_name="Phụ thu (%/giờ)")
    overtime_fixed = models.DecimalField(default=50000, max_digits=12, decimal_places=0, verbose_name="Phụ thu (VNĐ/giờ)")
    
    # Giới hạn: Sau bao nhiêu giờ thì tính 1 ngày
    overtime_threshold_hours = models.IntegerField(default=4, verbose_name="Giới hạn quá giờ (giờ) tính 1 ngày")

    def __str__(self):
        return f"Cài đặt - {self.branch.name}"