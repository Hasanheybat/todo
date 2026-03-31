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

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(['TASK', 'GOREV'])
  @IsOptional()
  type?: string

  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  @IsOptional()
  priority?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsString()
  @IsOptional()
  businessId?: string

  @IsString()
  @IsOptional()
  departmentId?: string

  @IsString()
  @IsOptional()
  parentId?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeIds?: string[]

  @IsString()
  @IsOptional()
  approverId?: string

  @IsString()
  @IsOptional()
  groupId?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTaskDto)
  @IsOptional()
  subTasks?: SubTaskDto[]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labelIds?: string[]

  @IsArray()
  @IsOptional()
  newLabels?: { name: string; color?: string }[]

  @IsString()
  @IsOptional()
  projectId?: string

  @IsOptional()
  isRecurring?: boolean

  @IsString()
  @IsOptional()
  recurRule?: string
}
