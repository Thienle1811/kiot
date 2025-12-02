from django.db import models
from django.contrib.auth.models import AbstractUser

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
    
    # --- CÁC TRƯỜNG MỚI CHO ĐẶT PHÒNG ---
    check_in_expected = models.DateTimeField(null=True, blank=True)
    check_out_expected = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True, null=True)
    # -------------------------------------
    
    created_at = models.DateTimeField(auto_now_add=True)

class BookingRoom(models.Model):
    # Định nghĩa các loại hình đặt phòng
    BOOKING_TYPE_CHOICES = (
        ('HOURLY', 'Theo giờ'),
        ('DAILY', 'Theo ngày'),
        ('OVERNIGHT', 'Qua đêm'),
    )
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booking_rooms')
    room = models.ForeignKey(Room, on_delete=models.PROTECT)
    
    # --- THÊM MỚI: Mặc định là DAILY ---
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPE_CHOICES, default='DAILY')
    
    check_in_actual = models.DateTimeField(null=True, blank=True)
    check_out_actual = models.DateTimeField(null=True, blank=True)
    
    # --- SỬA TÊN: Đổi price_hourly_snapshot -> price_snapshot ---
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