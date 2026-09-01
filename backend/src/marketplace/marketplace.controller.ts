import {
    Controller, Get, Post, Put, Delete, Body, Param, Res,
    UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MarketplaceService } from './marketplace.service';
import {
    MarketplaceProfileDto,
    MarketplaceCategoryDto,
    MarketplaceLocationDto,
    MarketplaceProductItemDto,
    BatchStatusUpdateDto,
    ExportFilterDto
} from './marketplace.dto';

@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) {}

    /* ─── Settings Endpoints ─── */
    @Get('settings')
    async getSettings() {
        return await this.marketplaceService.getSettings();
    }

    @Post('profiles')
    async saveProfiles(@Body('profiles') profiles: MarketplaceProfileDto[]) {
        return await this.marketplaceService.saveProfiles(profiles);
    }

    @Post('categories')
    async saveCategories(@Body('categories') categories: MarketplaceCategoryDto[]) {
        return await this.marketplaceService.saveCategories(categories);
    }

    @Post('locations')
    async saveLocations(@Body('locations') locations: MarketplaceLocationDto[]) {
        return await this.marketplaceService.saveLocations(locations);
    }

    /* ─── Products Endpoints ─── */
    @Get('products')
    async getProducts() {
        return await this.marketplaceService.getProducts();
    }

    @Post('products')
    async saveProduct(@Body() dto: MarketplaceProductItemDto) {
        return await this.marketplaceService.saveProduct(dto);
    }

    @Put('products/:id')
    async updateProduct(@Param('id') id: string, @Body() dto: MarketplaceProductItemDto) {
        return await this.marketplaceService.updateProduct(id, dto);
    }

    @Delete('products/:id')
    async deleteProduct(@Param('id') id: string) {
        return await this.marketplaceService.deleteProduct(id);
    }

    @Post('products/batch-status')
    async batchUpdateStatus(@Body() dto: BatchStatusUpdateDto) {
        return await this.marketplaceService.batchUpdateStatus(dto);
    }

    /* ─── Import & Export Endpoints ─── */
    @Get('template')
    async downloadTemplate(@Res() res: Response) {
        return await this.marketplaceService.generateTemplate(res);
    }

    @Post('export')
    async exportProducts(@Body() dto: ExportFilterDto, @Res() res: Response) {
        return await this.marketplaceService.exportProducts(dto, res);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importProducts(@UploadedFile() file: any) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Please upload a valid Excel spreadsheet file (.xlsx)');
        }
        return await this.marketplaceService.importProducts(file.buffer);
    }
}
