import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class CreateProjectDto {
  @IsString()
  name: string

  @IsString() @IsOptional()
  color?: string

  @IsBoolean() @IsOptional()
  isFavorite?: boolean
}
