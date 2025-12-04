from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDate
import math
from datetime import timedelta, datetime
from .models import (
    Branch, Area, RoomClass, Room, Booking, Customer, BookingRoom, 
    Product, ServiceOrder, User, CashFlow,
    Device, MaintenanceLog # <--- Import mới
)
from .serializers import (
    BranchSerializer, AreaSerializer, RoomClassSerializer, RoomSerializer, 
    BookingSerializer, ProductSerializer, ServiceOrderSerializer, 
    CustomerSerializer, UserSerializer, CashFlowSerializer,
    DeviceSerializer, MaintenanceLogSerializer # <--- Import mới
)

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer

class RoomClassViewSet(viewsets.ModelViewSet):
    queryset = RoomClass.objects.all()
    serializer_class = RoomClassSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        main_customer_data = {k: v for k, v in data.items() if k != 'accompanying_people'}
        serializer = self.get_serializer(data=main_customer_data)
        serializer.is_valid(raise_exception=True)
        main_customer = serializer.save()

        accompanying_list = data.get('accompanying_people', [])
        for person in accompanying_list:
            if person.get('full_name'):
                person['representative'] = main_customer.id
                person['type'] = 'INDIVIDUAL'
                sub_serializer = self.get_serializer(data=person)
                if sub_serializer.is_valid(): sub_serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        main_customer_data = {k: v for k, v in data.items() if k != 'accompanying_people'}
        serializer = self.get_serializer(instance, data=main_customer_data, partial=True)
        serializer.is_valid(raise_exception=True)
        main_customer = serializer.save()

        accompanying_list = data.get('accompanying_people', [])
        for person in accompanying_list:
            person['representative'] = main_customer.id
            if 'id' in person and person['id']:
                try:
                    sub_cust = Customer.objects.get(id=person['id'])
                    sub_serializer = self.get_serializer(sub_cust, data=person, partial=True)
                    if sub_serializer.is_valid(): sub_serializer.save()
                except Customer.DoesNotExist: pass
            elif person.get('full_name'):
                sub_serializer = self.get_serializer(data=person)
                if sub_serializer.is_valid(): sub_serializer.save()
        return Response(serializer.data)

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    
    def get_queryset(self):
        queryset = Room.objects.all()
        branch_id = self.request.query_params.get('branch', None)
        if branch_id is not None:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def check_in(self, request, pk=None):
        room = self.get_object()
        if room.status != 'AVAILABLE':
            return Response({'error': 'Phòng này đang có khách!'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        booking_type = data.get('booking_type', 'DAILY')

        def create_or_update_customer(cust_data, rep=None):
            defaults = {
                'full_name': cust_data.get('full_name'), 'birth_date': cust_data.get('birth_date'),
                'identity_type': cust_data.get('identity_type', 'CCCD'), 'phone': cust_data.get('phone'),
                'address': cust_data.get('address'), 'license_plate': cust_data.get('license_plate'),
                'type': 'INDIVIDUAL', 'representative': rep
            }
            identity_card = cust_data.get('identity_card')
            if identity_card:
                customer, _ = Customer.objects.update_or_create(identity_card=identity_card, defaults=defaults)
            else:
                customer = Customer.objects.create(identity_card=None, **defaults)
            return customer

        main_customer = create_or_update_customer(data, rep=None)
        accompanying_list = data.get('accompanying_people', [])
        for person in accompanying_list:
            if person.get('full_name'):
                if not person.get('address'): person['address'] = main_customer.address
                create_or_update_customer(person, rep=main_customer)

        booking_code = f"DP{timezone.now().strftime('%Y%m%d%H%M%S')}"
        booking = Booking.objects.create(
            branch=room.branch, customer=main_customer, status='CHECKED_IN', code=booking_code, total_amount=0
        )
        
        price_snapshot = 0
        if booking_type == 'HOURLY':
            price_snapshot = room.room_class.base_price_hourly
        elif booking_type == 'OVERNIGHT':
            price_snapshot = room.room_class.base_price_overnight
        else:
            booking_type = 'DAILY'
            price_snapshot = room.room_class.base_price_daily

        BookingRoom.objects.create(
            booking=booking, room=room, 
            booking_type=booking_type,
            check_in_actual=timezone.now(), 
            price_snapshot=price_snapshot
        )
        room.status = 'OCCUPIED'
        room.save()
        return Response({'status': 'success', 'message': f'Đã nhận phòng ({booking_type})'})

    @action(detail=True, methods=['post'])
    def add_service(self, request, pk=None):
        room = self.get_object()
        if room.status != 'OCCUPIED': return Response({'error': 'Phòng trống!'}, status=400)
        try:
            booking = BookingRoom.objects.filter(room=room, check_out_actual__isnull=True).latest('id').booking
            product = Product.objects.get(id=request.data.get('product_id'))
            ServiceOrder.objects.create(booking=booking, product=product, quantity=int(request.data.get('quantity', 1)), unit_price_snapshot=product.selling_price)
            return Response({'status': 'success', 'message': 'Đã thêm dịch vụ'})
        except Exception as e: return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        room = self.get_object()
        if room.status != 'OCCUPIED': return Response({'error': 'Phòng trống!'}, status=400)
        try:
            booking_room = BookingRoom.objects.filter(room=room, check_out_actual__isnull=True).latest('id')
            check_out_time = timezone.now()
            duration = check_out_time - booking_room.check_in_actual
            
            room_money = 0
            hours = 0 
            
            if booking_room.booking_type == 'HOURLY':
                hours = max(1, math.ceil(duration.total_seconds() / 3600))
                room_money = hours * booking_room.price_snapshot
            elif booking_room.booking_type == 'OVERNIGHT':
                hours = math.ceil(duration.total_seconds() / 3600)
                room_money = booking_room.price_snapshot 
            else:
                days = max(1, math.ceil(duration.total_seconds() / 86400))
                hours = days * 24 
                room_money = days * booking_room.price_snapshot
            
            booking = booking_room.booking
            service_money = sum(s.quantity * s.unit_price_snapshot for s in booking.service_orders.all())
            total_money = room_money + service_money

            booking_room.check_out_actual = check_out_time
            booking_room.save()
            booking.total_amount = total_money
            booking.status = 'COMPLETED'
            booking.save()
            room.status = 'AVAILABLE'
            room.save()

            CashFlow.objects.create(
                branch=room.branch, booking=booking, flow_type='RECEIPT',
                category='Thu tiền phòng', amount=total_money, description=f"Thu tiền {booking_room.get_booking_type_display()} phòng {room.name}"
            )
            return Response({
                'status': 'success', 'message': 'Trả phòng thành công!',
                'data': {
                    'code': booking.code, 
                    'customer': booking.customer.full_name, 
                    'room_name': room.name, 
                    'hours': hours, 
                    'room_money': room_money, 
                    'service_money': service_money, 
                    'total_money': total_money,
                    'booking_type': booking_room.get_booking_type_display()
                }
            })
        except Exception as e: return Response({'status': 'error', 'message': str(e)}, status=400)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by('-created_at')
    serializer_class = BookingSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        filter_type = request.query_params.get('filter', 'this_month')
        today = timezone.now().date()
        if filter_type == 'today': start, end = today, today
        elif filter_type == 'yesterday': start, end = today - timedelta(days=1), today - timedelta(days=1)
        elif filter_type == 'last_7_days': start, end = today - timedelta(days=7), today
        elif filter_type == 'this_month': start, end = today.replace(day=1), today
        else: start, end = today - timedelta(days=30), today
        return Response({
            'revenue_chart': list(Booking.objects.filter(created_at__date__range=[start, end], status='COMPLETED').annotate(date=TruncDate('created_at')).values('date').annotate(total=Sum('total_amount')).order_by('date')), 
            'occupancy_chart': list(BookingRoom.objects.filter(check_in_actual__date__range=[start, end]).annotate(date=TruncDate('check_in_actual')).values('date').annotate(count=Count('id')).order_by('date')), 
            'total_rooms': Room.objects.count()
        })

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def reserve(self, request):
        data = request.data
        customer_data = data.get('customer', {})
        if not customer_data.get('full_name'): 
            return Response({'error': 'Thiếu tên khách'}, status=400)
        
        customer, _ = Customer.objects.get_or_create(
            full_name=customer_data.get('full_name'), 
            defaults={'phone': customer_data.get('phone')}
        )
        
        booking_code = f"RES{timezone.now().strftime('%Y%m%d%H%M%S')}"
        booking = Booking.objects.create(
            branch=Branch.objects.first(), 
            customer=customer, 
            status='RESERVED', 
            code=booking_code,
            check_in_expected=data.get('check_in_expected'), 
            check_out_expected=data.get('check_out_expected'), 
            note=data.get('note')
        )

        if data.get('room_id'):
            try:
                room = Room.objects.get(id=data.get('room_id'))
                booking_type = data.get('booking_type', 'DAILY')
                
                price_snapshot = 0
                if booking_type == 'HOURLY':
                    price_snapshot = room.room_class.base_price_hourly
                elif booking_type == 'OVERNIGHT':
                    price_snapshot = room.room_class.base_price_overnight
                else:
                    price_snapshot = room.room_class.base_price_daily
                    booking_type = 'DAILY'

                BookingRoom.objects.create(
                    booking=booking, 
                    room=room, 
                    booking_type=booking_type,
                    price_snapshot=price_snapshot
                )
            except Room.DoesNotExist:
                return Response({'error': 'Phòng không tồn tại'}, status=400)

        return Response({'status': 'success', 'message': 'Đặt phòng thành công!', 'booking_id': booking.id})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def confirm_checkin(self, request, pk=None):
        booking = self.get_object()
        if booking.status != 'RESERVED':
            return Response({'error': 'Đơn này không phải đặt trước hoặc đã check-in rồi'}, status=400)

        data = request.data
        
        customer_data = data.get('customer', {})
        if customer_data:
            cust_obj = booking.customer
            if customer_data.get('identity_card'): cust_obj.identity_card = customer_data.get('identity_card')
            if customer_data.get('phone'): cust_obj.phone = customer_data.get('phone')
            if customer_data.get('address'): cust_obj.address = customer_data.get('address')
            if customer_data.get('birth_date'): cust_obj.birth_date = customer_data.get('birth_date')
            if customer_data.get('license_plate'): cust_obj.license_plate = customer_data.get('license_plate')
            cust_obj.save()

            accompanying_list = data.get('accompanying_people', [])
            for person in accompanying_list:
                if person.get('full_name'):
                    defaults = {
                        'full_name': person.get('full_name'),
                        'birth_date': person.get('birth_date'),
                        'identity_type': person.get('identity_type', 'CCCD'),
                        'identity_card': person.get('identity_card'),
                        'address': person.get('address') or cust_obj.address,
                        'type': 'INDIVIDUAL',
                        'representative': cust_obj
                    }
                    if person.get('identity_card'):
                        Customer.objects.update_or_create(identity_card=person['identity_card'], defaults=defaults)
                    else:
                        Customer.objects.create(**defaults)

        booking.status = 'CHECKED_IN'
        if data.get('note'): booking.note = data.get('note')
        booking.save()

        new_booking_type = data.get('booking_type') 
        
        for br in booking.booking_rooms.all():
            br.check_in_actual = timezone.now()
            
            if new_booking_type:
                br.booking_type = new_booking_type
                if new_booking_type == 'HOURLY':
                    br.price_snapshot = br.room.room_class.base_price_hourly
                elif new_booking_type == 'OVERNIGHT':
                    br.price_snapshot = br.room.room_class.base_price_overnight
                elif new_booking_type == 'DAILY':
                    br.price_snapshot = br.room.room_class.base_price_daily
            
            br.save()
            br.room.status = 'OCCUPIED'
            br.room.save()

        return Response({
            'status': 'success', 
            'message': 'Đã nhận phòng thành công (Đã cập nhật thông tin khách & giá)',
            'data': BookingSerializer(booking).data
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'CANCELLED'
        booking.save()
        return Response({'status': 'success', 'message': 'Đã hủy đơn đặt phòng'})

class CashFlowViewSet(viewsets.ModelViewSet):
    queryset = CashFlow.objects.all().order_by('-created_at')
    serializer_class = CashFlowSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

# --- NEW VIEWSETS: THIẾT BỊ ---
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def log_maintenance(self, request, pk=None):
        """Ghi nhận bảo trì và tạo phiếu chi nếu có"""
        device = self.get_object()
        data = request.data
        
        # 1. Tạo log
        MaintenanceLog.objects.create(
            device=device,
            cost=data.get('cost', 0),
            description=data.get('description', ''),
            performer=data.get('performer', 'Nhân viên')
        )
        
        # 2. Cập nhật thiết bị
        device.last_maintenance_date = timezone.now().date()
        device.status = 'GOOD' # Mặc định sau khi bảo trì là tốt
        device.save()
        
        # 3. Tạo phiếu chi tự động (Nếu có chi phí > 0)
        cost = int(data.get('cost', 0))
        if cost > 0:
            CashFlow.objects.create(
                branch=device.branch,
                flow_type='PAYMENT',
                category='Chi phí bảo trì',
                amount=cost,
                description=f"Bảo trì: {device.name} ({data.get('description')})"
            )

        return Response({'status': 'success', 'message': 'Đã ghi nhận bảo trì thành công'})

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all().order_by('-created_at')
    serializer_class = MaintenanceLogSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        device_id = self.request.query_params.get('device', None)
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        return queryset

class ReportViewSet(viewsets.ViewSet):
    def get_date_range(self, request):
        filter_type = request.query_params.get('filter', 'this_month')
        today = timezone.now().date()
        if filter_type == 'today': start, end = today, today
        elif filter_type == 'yesterday': start, end = today - timedelta(days=1), today - timedelta(days=1)
        elif filter_type == 'last_7_days': start, end = today - timedelta(days=7), today
        elif filter_type == 'this_month': start, end = today.replace(day=1), today
        else: start, end = today - timedelta(days=30), today
        return start, end

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        start, end = self.get_date_range(request)
        bookings = Booking.objects.filter(created_at__date__range=[start, end], status='COMPLETED')
        daily_rev = bookings.annotate(date=TruncDate('created_at')).values('date').annotate(total=Sum('total_amount')).order_by('date')
        total_rev = bookings.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        service_rev = ServiceOrder.objects.filter(booking__in=bookings).aggregate(total=Sum(F('quantity') * F('unit_price_snapshot')))['total'] or 0
        return Response({'chart_data': list(daily_rev), 'summary': {'total': total_rev, 'room_revenue': total_rev - service_rev, 'service_revenue': service_rev}})

    @action(detail=False, methods=['get'])
    def finance(self, request):
        start, end = self.get_date_range(request)
        flows = CashFlow.objects.filter(created_at__date__range=[start, end])
        daily = flows.annotate(date=TruncDate('created_at')).values('date', 'flow_type').annotate(amount=Sum('amount')).order_by('date')
        receipt = flows.filter(flow_type='RECEIPT').aggregate(Sum('amount'))['amount__sum'] or 0
        payment = flows.filter(flow_type='PAYMENT').aggregate(Sum('amount'))['amount__sum'] or 0
        return Response({'chart_data': list(daily), 'summary': {'receipt': receipt, 'payment': payment, 'profit': receipt - payment}})

    @action(detail=False, methods=['get'])
    def goods(self, request):
        start, end = self.get_date_range(request)
        stats = ServiceOrder.objects.filter(created_at__date__range=[start, end]).values('product__name').annotate(total_qty=Sum('quantity'), total_sales=Sum(F('quantity') * F('unit_price_snapshot'))).order_by('-total_qty')
        return Response(list(stats))

    @action(detail=False, methods=['get'])
    def room_performance(self, request):
        start, end = self.get_date_range(request)
        stats = BookingRoom.objects.filter(check_in_actual__date__range=[start, end]).values('room__name', 'room__room_class__name').annotate(booking_count=Count('id'), total_revenue=Sum('booking__total_amount')).order_by('-total_revenue')
        return Response(list(stats))