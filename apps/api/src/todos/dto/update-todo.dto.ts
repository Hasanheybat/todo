import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator'

export class UpdateTodoDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  @IsOptional()
  priority?: string

  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PENDING_APPROVAL', 'ACCEPTED'])
  @IsOptional()
  status?: string

  @IsEnum(['PRIVATE', 'TEAM', 'BUSINESS'])
  @IsOptional()
  visibility?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string
}
