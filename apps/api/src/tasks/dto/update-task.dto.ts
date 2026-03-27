import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class SubTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsOptional()
  assigneeId?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[]

  @IsString()
  @IsOptional()
  approverId?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(['TASK', 'GOREV'])
  @IsOptional()
  type?: string

  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  @IsOptional()
  priority?: string

  @IsEnum(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'])
  @IsOptional()
  status?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsString()
  @IsOptional()
  businessId?: string

  @IsString()
  @IsOptional()
  departmentId?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[]

  @IsString()
  @IsOptional()
  approverId?: string

  @IsString()
  @IsOptional()
  projectId?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labelIds?: string[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTaskDto)
  @IsOptional()
  subTasks?: SubTaskDto[]
}
