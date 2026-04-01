import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsDateString } from 'class-validator'

enum TodoStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export class CreateTaskDto {
  @IsString()
  content: string

  @IsString() @IsOptional()
  description?: string

  @IsString() @IsOptional()
  priority?: string  // P1 | P2 | P3 | P4

  @IsString() @IsOptional()
  projectId?: string

  @IsString() @IsOptional()
  sectionId?: string

  @IsString() @IsOptional()
  parentId?: string

  @IsDateString() @IsOptional()
  dueDate?: string

  @IsString() @IsOptional()
  dueString?: string

  @IsBoolean() @IsOptional()
  isRecurring?: boolean

  @IsString() @IsOptional()
  recurRule?: string

  @IsString() @IsOptional()
  recurringRule?: string  // Frontend alias → recurRule ilə eynidir

  @IsNumber() @IsOptional()
  duration?: number  // dəqiqə ilə

  @IsDateString() @IsOptional()
  reminder?: string  // ISO datetime

  @IsDateString() @IsOptional()
  reminderAt?: string  // Frontend alias → reminder ilə eynidir

  @IsString() @IsOptional()
  location?: string  // konum

  @IsString({ each: true }) @IsOptional()
  labelIds?: string[]
}

export class UpdateTaskDto {
  @IsString() @IsOptional()
  content?: string

  @IsString() @IsOptional()
  description?: string

  @IsString() @IsOptional()
  priority?: string

  @IsString() @IsOptional()
  projectId?: string

  @IsString() @IsOptional()
  sectionId?: string

  @IsDateString() @IsOptional()
  dueDate?: string

  @IsString() @IsOptional()
  dueString?: string

  @IsBoolean() @IsOptional()
  isCompleted?: boolean

  @IsNumber() @IsOptional()
  duration?: number

  @IsDateString() @IsOptional()
  reminder?: string

  @IsDateString() @IsOptional()
  reminderAt?: string  // Frontend alias → reminder ilə eynidir

  @IsBoolean() @IsOptional()
  isRecurring?: boolean

  @IsString() @IsOptional()
  recurRule?: string

  @IsString() @IsOptional()
  recurringRule?: string  // Frontend alias → recurRule ilə eynidir

  @IsString() @IsOptional()
  location?: string

  @IsString({ each: true }) @IsOptional()
  labelIds?: string[]

  @IsEnum(TodoStatus, { message: 'todoStatus WAITING, IN_PROGRESS, DONE və ya CANCELLED olmalıdır' }) @IsOptional()
  todoStatus?: string
}
