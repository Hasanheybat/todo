import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator'

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  @IsOptional()
  priority?: string

  @IsEnum(['PRIVATE', 'TEAM', 'BUSINESS'])
  @IsOptional()
  visibility?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsString()
  @IsOptional()
  businessId?: string
}
