import { Controller, Post, Get, Put, Body, Query, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async createOrder(@Request() req, @Body() orderData: any) {
        // Add user metadata to order  
        const enrichedData = {
            ...orderData,
            created_by: req.user.full_name || req.user.email
        };
        return this.ordersService.createExternalOrder(enrichedData);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getOrders(
        @Request() req,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('customer_id') customerId?: string,
    ) {
        const limitNum = limit ? parseInt(limit) : 1000;
        const offsetNum = offset ? parseInt(offset) : 0;

        if (customerId) {
            return this.ordersService.getOrdersByCustomer(customerId, req.user);
        }

        return this.ordersService.getAllOrders(limitNum, offsetNum, req.user);
    }



    @UseGuards(AuthGuard('jwt'))
    @Put(':id')
    async updateOrder(@Request() req, @Param('id') id: string, @Body() orderData: any) {
        return this.ordersService.updateOrder(id, orderData, req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('test-message')
    async testMessage(@Body() body: { orderId: string; status: string }) {
        return this.ordersService.testAutoMessage(body.orderId, body.status);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('inventory-products')
    async getInventoryProducts(@Query('search') search?: string) {
        return this.ordersService.getInventoryProducts(search);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    async getOrderById(@Request() req, @Param('id') id: string) {
        return this.ordersService.getOrderById(id, req.user);
    }

    // Webhook endpoint for inventory app to update order status
    @Put('status/sync')
    async syncStatusFromInventory(@Body() body: { order_number: string; status: string }, @Query('api_key') apiKey?: string) {
        // Validate API key from query or Authorization header
        const validApiKey = process.env.INVENTORY_APP_API_KEY;

        if (apiKey !== validApiKey) {
            return { error: 'Unauthorized', status: 401 };
        }

        return this.ordersService.updateStatusFromInventory(body.order_number, body.status);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/assign-rider')
    async assignRider(@Request() req, @Param('id') id: string, @Body() body: { riderId: string }) {
        const adminName = req.user.full_name || req.user.email;
        return this.ordersService.assignToRider(id, body.riderId, adminName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('rider/assigned')
    async getRiderOrders(@Request() req) {
        return this.ordersService.getRiderOrders(req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/cancel-assignment')
    async cancelAssignment(@Request() req, @Param('id') id: string) {
        const actorName = req.user.full_name || req.user.email;
        return this.ordersService.cancelAssignment(id, actorName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/delivery-status')
    async updateDeliveryStatus(@Request() req, @Param('id') id: string, @Body() body: { status: string }) {
        const actorName = req.user.full_name || req.user.email;
        return this.ordersService.updateDeliveryStatus(id, body.status, actorName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('admin/delivery-list')
    async getAdminDeliveryOrders(@Request() req) {
        const role = req.user.role?.toLowerCase();
        console.log(`[Admin Delivery List] User: ${req.user.email}, Role: ${role}`);
        
        if (role !== 'admin' && role !== 'editor') {
            throw new UnauthorizedException('Admin or Editor access required');
        }
        
        const orders = await this.ordersService.getAdminDeliveryOrders();
        console.log(`[Admin Delivery List] Found ${orders.length} orders`);
        return orders;
    }
}
