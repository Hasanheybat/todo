import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  BUSINESS_MANAGER = 'BUSINESS_MANAGER',
  TEAM_MANAGER = 'TEAM_MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export class UserBusinessAssignmentDto {
  @IsString()
  @IsNotEmpty()
  businessId: string

  @IsString()
  @IsOptional()
  departmentId?: string

  @IsString()
  @IsOptional()
  customRoleId?: string

  @IsString()
  @IsOptional()
  positionTitle?: string

  @IsNumber()
  @IsOptional()
  salary?: number

  @IsNumber()
  @IsOptional()
  payDay?: number

  @IsString()
  @IsOptional()
  startDate?: string
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsEnum(UserRole)
  role: UserRole

  @IsString()
  @IsOptional()
  parentId?: string

  @IsString()
  @IsOptional()
  businessId?: string

  @IsString()
  @IsOptional()
  departmentId?: string

  @IsString()
  @IsOptional()
  customRoleId?: string

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserBusinessAssignmentDto)
  assignments?: UserBusinessAssignmentDto[]
}
