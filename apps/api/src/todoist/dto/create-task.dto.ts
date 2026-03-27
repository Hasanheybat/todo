import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'

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

  @IsString() @IsOptional()
  dueDate?: string

  @IsString() @IsOptional()
  dueString?: string

  @IsBoolean() @IsOptional()
  isRecurring?: boolean

  @IsString() @IsOptional()
  recurRule?: string

  @IsNumber() @IsOptional()
  duration?: number  // dəqiqə ilə

  @IsString() @IsOptional()
  reminder?: string  // ISO datetime

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

  @IsString() @IsOptional()
  dueDate?: string

  @IsString() @IsOptional()
  dueString?: string

  @IsBoolean() @IsOptional()
  isCompleted?: boolean

  @IsNumber() @IsOptional()
  duration?: number

  @IsString() @IsOptional()
  reminder?: string

  @IsBoolean() @IsOptional()
  isRecurring?: boolean

  @IsString() @IsOptional()
  recurRule?: string

  @IsString() @IsOptional()
  location?: string

  @IsString({ each: true }) @IsOptional()
  labelIds?: string[]
}
