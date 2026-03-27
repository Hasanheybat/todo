import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsInt, IsBoolean, ValidateNested, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

enum ScheduleType { ONCE = 'ONCE', DAILY = 'DAILY', WEEKLY = 'WEEKLY', MONTHLY = 'MONTHLY', CUSTOM = 'CUSTOM' }
enum Priority { CRITICAL = 'CRITICAL', HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW', INFO = 'INFO' }

class TemplateItemDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsEnum(Priority)
  @IsOptional()
  priority?: string = 'MEDIUM'

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(ScheduleType)
  scheduleType: string

  @IsString()
  @IsOptional()
  scheduleTime?: string = '09:00'

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(6)
  dayOfWeek?: number

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(31)
  dayOfMonth?: number

  @IsInt()
  @IsOptional()
  @Min(1)
  customDays?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items: TemplateItemDto[]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[]

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean

  @IsString()
  @IsOptional()
  businessId?: string

  @IsString()
  @IsOptional()
  departmentId?: string

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(31)
  notificationDay?: number

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(31)
  deadlineDay?: number

  @IsString()
  @IsOptional()
  endDate?: string
}
