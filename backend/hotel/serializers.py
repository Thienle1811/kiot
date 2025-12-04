from rest_framework import serializers
from .models import (
    Branch, Area, RoomClass, Room, Booking, Product, ServiceOrder, 
    Customer, User, BookingRoom, CashFlow,
    Device, MaintenanceLog, ActivityLog, BranchSetting # <--- Import model BranchSetting
)

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = '__all__'

class RoomClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomClass
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    room_class_name = serializers.CharField(source='room_class.name', read_only=True)
    area_name = serializers.CharField(source='area.name', read_only=True)
    price_hourly = serializers.DecimalField(source='room_class.base_price_hourly', max_digits=12, decimal_places=0, read_only=True)
    current_booking = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'name', 'status', 'branch', 'area', 'area_name', 'room_class', 'room_class_name', 'price_hourly', 'current_booking']

    def get_current_booking(self, obj):
        if obj.status == 'OCCUPIED':
            try:
                booking_room = obj.bookingroom_set.filter(check_out_actual__isnull=True).latest('id')
                return {
                    'booking_type': booking_room.booking_type,
                    'booking_type_display': booking_room.get_booking_type_display(),
                    'price': booking_room.price_snapshot,
                    'check_in': booking_room.check_in_actual
                }
            except Exception:
                return None
        return None

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class ServiceOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = ServiceOrder
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price_snapshot', 'total_price', 'created_at']

class CustomerSerializer(serializers.ModelSerializer):
    representative_name = serializers.SerializerMethodField()
    entourage = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'

    def get_representative_name(self, obj):
        return obj.representative.full_name if obj.representative else None

    def get_entourage(self, obj):
        people = obj.entourage.all()
        return CustomerSerializer(people, many=True).data

class BookingRoomDetailSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    class Meta:
        model = BookingRoom
        fields = ['room_name', 'booking_type', 'check_in_actual', 'check_out_actual', 'price_snapshot']

class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    room_name = serializers.SerializerMethodField()
    service_orders = ServiceOrderSerializer(many=True, read_only=True) 
    booking_details = BookingRoomDetailSerializer(source='booking_rooms', many=True, read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'code', 'customer_name', 'room_name', 'total_amount', 'status', 'created_at', 'service_orders', 'booking_details', 'check_in_expected', 'check_out_expected', 'note']

    def get_room_name(self, obj):
        first_room = obj.booking_rooms.first()
        return first_room.room.name if first_room else "N/A"

class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    password = serializers.CharField(write_only=True, required=False) 

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 'branch', 'branch_name', 'is_active']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password: user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items(): setattr(instance, attr, value)
        if password: instance.set_password(password)
        instance.save()
        return instance

class CashFlowSerializer(serializers.ModelSerializer):
    booking_code = serializers.CharField(source='booking.code', read_only=True)
    class Meta:
        model = CashFlow
        fields = ['id', 'branch', 'booking', 'booking_code', 'flow_type', 'category', 'amount', 'description', 'created_at']

class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    area_name = serializers.CharField(source='area.name', read_only=True)
    next_maintenance_date = serializers.ReadOnlyField() 

    class Meta:
        model = Device
        fields = '__all__'

class MaintenanceLogSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    
    class Meta:
        model = MaintenanceLog
        fields = '__all__'

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = '__all__'

# --- SERIALIZER MỚI CHO CẤU HÌNH ---
class BranchSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BranchSetting
        fields = '__all__'