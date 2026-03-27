import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { TodosService } from './todos.service'
import { CreateTodoDto } from './dto/create-todo.dto'
import { UpdateTodoDto } from './dto/update-todo.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private todosService: TodosService) {}

  @Post()
  create(@Body() dto: CreateTodoDto, @Req() req: any) {
    return this.todosService.create(dto, req.user.sub, req.user.tenantId)
  }

  @Get()
  findAll(@Req() req: any) {
    return this.todosService.findAll(req.user.sub, req.user.tenantId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.todosService.findOne(id, req.user.tenantId)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTodoDto, @Req() req: any) {
    return this.todosService.update(id, dto, req.user.tenantId)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.todosService.remove(id, req.user.tenantId)
  }
}
