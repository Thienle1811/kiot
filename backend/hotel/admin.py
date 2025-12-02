from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Branch, Area, RoomClass, Room, 
    Customer, Booking, BookingRoom, Product, ServiceOrder
)

# Đăng ký User
admin.site.register(User, UserAdmin)

# Đăng ký Cấu hình cơ bản
admin.site.register(Branch)
admin.site.register(Area)
admin.site.register(RoomClass)
admin.site.register(Room)

# Đăng ký Nghiệp vụ & Khách hàng
admin.site.register(Customer)
admin.site.register(Booking)
admin.site.register(BookingRoom)

# Đăng ký Dịch vụ & Hàng hóa (Mới thêm)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'selling_price', 'stock_quantity', 'branch')
    search_fields = ('name',)

admin.site.register(Product, ProductAdmin)
admin.site.register(ServiceOrder)