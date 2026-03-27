import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { UserRole, UserBusinessAssignmentDto } from './create-user.dto'

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole

  @IsString()
  @IsOptional()
  parentId?: string

  @IsString()
  @IsOptional()
  status?: string

  @IsString()
  @IsOptional()
  customRoleId?: string

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserBusinessAssignmentDto)
  assignments?: UserBusinessAssignmentDto[]
}
