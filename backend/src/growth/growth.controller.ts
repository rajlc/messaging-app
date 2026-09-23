import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GrowthService } from './growth.service';
import { OrderReportsService } from './order-reports.service';

@Controller('api/growth')
@UseGuards(AuthGuard('jwt'))
export class GrowthController {
    constructor(
        private readonly growthService: GrowthService,
        private readonly orderReportsService: OrderReportsService,
    ) { }

    // ─────────────────────────────────────────────────────────────
    // OVERVIEW
    // ─────────────────────────────────────────────────────────────

    @Get('overview')
    async getOverview(@Request() req) {
        return this.growthService.getOverview(req.user.id);
    }

    // ─────────────────────────────────────────────────────────────
    // DAILY ROUTINE & MIDNIGHT LOCK
    // ─────────────────────────────────────────────────────────────

    @Get('routine/tasks')
    async getRoutineTasks(@Request() req) {
        return this.growthService.getRoutineTasks(req.user.id);
    }

    @Post('routine/tasks')
    async saveRoutineTasks(@Request() req, @Body('tasks') tasks: any[]) {
        return this.growthService.saveRoutineTasks(req.user.id, tasks);
    }

    @Get('routine/:date')
    async getRoutineForDate(@Request() req, @Param('date') date: string) {
        return this.growthService.getRoutineForDate(req.user.id, date);
    }

    @Post('routine/toggle')
    async toggleRoutineTask(
        @Request() req,
        @Body('date') date: string,
        @Body('taskId') taskId: string,
        @Body('completed') completed: boolean,
    ) {
        return this.growthService.toggleRoutineTask(req.user.id, date, taskId, completed);
    }

    @Post('routine/rollover')
    async rolloverTask(
        @Request() req,
        @Body('fromDate') fromDate: string,
        @Body('toDate') toDate: string,
        @Body('taskId') taskId: string,
    ) {
        return this.growthService.rolloverTask(req.user.id, fromDate, toDate, taskId);
    }

    // ─────────────────────────────────────────────────────────────
    // DAILY WORK SUMMARY
    // ─────────────────────────────────────────────────────────────

    @Get('routine/summary/:date')
    async getDailySummary(@Request() req, @Param('date') date: string) {
        return this.growthService.getDailySummary(req.user.id, date);
    }

    @Post('routine/summary')
    async saveDailySummary(@Request() req, @Body('date') date: string, @Body('summary') summary: string) {
        return this.growthService.saveDailySummary(req.user.id, date, summary);
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGY BOARD & AI GENERATOR (With Conflict Resolution)
    // ─────────────────────────────────────────────────────────────

    @Get('strategy')
    async getStrategy(@Request() req) {
        return this.growthService.getStrategy(req.user.id);
    }

    @Post('strategy')
    async saveStrategy(@Request() req, @Body() body: any) {
        return this.growthService.saveStrategy(req.user.id, body);
    }

    @Post('strategy/generate')
    async generateAiStrategy(@Request() req, @Body() body: {
        instruction: string;
        platform: string;
        startDate: string;
        days: number;
        resolution?: 'merge' | 'overwrite';
    }) {
        return this.growthService.generateAiStrategy(req.user.id, body);
    }

    @Get('plan/schedule')
    async getScheduleOverview(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('days') days?: string
    ) {
        return this.growthService.getScheduleOverview(req.user.id, startDate, days ? parseInt(days) : 14);
    }

    // ─────────────────────────────────────────────────────────────
    // PROJECT & IDEA VAULT ("Plan / Idea" Tab)
    // ─────────────────────────────────────────────────────────────

    @Get('ideas')
    async getProjects(@Request() req) {
        return this.growthService.getProjects(req.user.id);
    }

    @Post('ideas/project')
    async saveProject(@Request() req, @Body() body: any) {
        return this.growthService.saveProject(req.user.id, body);
    }

    @Delete('ideas/project/:id')
    async deleteProject(@Request() req, @Param('id') id: string) {
        return this.growthService.deleteProject(req.user.id, id);
    }

    @Post('ideas/item')
    async addIdea(@Request() req, @Body() body: { projectId: string; title: string; description?: string }) {
        return this.growthService.addIdea(req.user.id, body.projectId, { title: body.title, description: body.description });
    }

    @Put('ideas/item/:projectId/:ideaId/status')
    async updateIdeaStatus(
        @Request() req,
        @Param('projectId') projectId: string,
        @Param('ideaId') ideaId: string,
        @Body('status') status: 'idea' | 'in_progress' | 'completed',
    ) {
        return this.growthService.updateIdeaStatus(req.user.id, projectId, ideaId, status);
    }

    @Delete('ideas/item/:projectId/:ideaId')
    async deleteIdea(
        @Request() req,
        @Param('projectId') projectId: string,
        @Param('ideaId') ideaId: string,
    ) {
        return this.growthService.deleteIdea(req.user.id, projectId, ideaId);
    }

    @Post('ideas/promote')
    async promoteIdeaToRoutine(
        @Request() req,
        @Body() body: { ideaTitle: string; dateStr: string; timeBlock?: string },
    ) {
        return this.growthService.promoteIdeaToRoutine(req.user.id, body);
    }

    // ─────────────────────────────────────────────────────────────
    // AI REPORTS (Daily & Weekly)
    // ─────────────────────────────────────────────────────────────

    @Post('ai-report/daily/generate')
    async generateDailyAiReport(@Request() req, @Body('date') date?: string) {
        return this.growthService.generateDailyAiReport(req.user.id, date);
    }

    @Get('ai-report/daily/:date')
    async getDailyAiReport(@Request() req, @Param('date') date: string) {
        return this.growthService.getDailyAiReport(req.user.id, date);
    }

    @Post('ai-report/weekly/generate')
    async generateWeeklyAiReport(@Request() req, @Body('weekStart') weekStart?: string) {
        return this.growthService.generateWeeklyAiReport(req.user.id, weekStart);
    }

    @Get('ai-report/weekly/:weekStart')
    async getWeeklyAiReport(@Request() req, @Param('weekStart') weekStart: string) {
        return this.growthService.getWeeklyAiReport(req.user.id, weekStart);
    }

    // ─────────────────────────────────────────────────────────────
    // HOLIDAYS (Supports Multiple)
    // ─────────────────────────────────────────────────────────────

    @Get('holidays')
    async getHolidays(@Request() req) {
        return this.growthService.getHolidays(req.user.id);
    }

    @Post('holidays')
    async addHoliday(@Request() req, @Body() body: any) {
        return this.growthService.addHoliday(req.user.id, body);
    }

    @Delete('holidays/:id')
    async deleteHoliday(@Request() req, @Param('id') id: string) {
        return this.growthService.deleteHoliday(req.user.id, id);
    }

    // ─────────────────────────────────────────────────────────────
    // SCORECARD
    // ─────────────────────────────────────────────────────────────

    @Get('scorecard/:weekStart')
    async getScorecard(@Request() req, @Param('weekStart') weekStart: string) {
        return this.growthService.getScorecard(req.user.id, weekStart);
    }

    @Post('scorecard/:weekStart')
    async saveScorecard(@Request() req, @Param('weekStart') weekStart: string, @Body() body: any) {
        return this.growthService.saveScorecard(req.user.id, weekStart, body);
    }

    // ─────────────────────────────────────────────────────────────
    // ORDER REPORTS (Daraz + All Platforms, Excl. Cancelled)
    // ─────────────────────────────────────────────────────────────

    @Get('order-reports/daily')
    async getDailyOrderProgress(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.orderReportsService.getDailyOrderProgress(startDate, endDate);
    }

    @Get('order-reports/weekly')
    async getWeeklyOrderReport(
        @Request() req,
        @Query('weekStart') weekStart?: string,
    ) {
        return this.orderReportsService.getWeeklyReport(req.user.id, weekStart);
    }

    @Post('order-reports/weekly/summary')
    async saveSundaySummary(
        @Request() req,
        @Body('weekStart') weekStart: string,
        @Body('summary') summary: string,
        @Body('actionPlan') actionPlan: string,
    ) {
        return this.orderReportsService.saveSundaySummary(req.user.id, weekStart, { summary, actionPlan });
    }

    @Get('order-reports/history')
    async getReportHistory(@Request() req) {
        return this.orderReportsService.getReportHistory(req.user.id);
    }
}
