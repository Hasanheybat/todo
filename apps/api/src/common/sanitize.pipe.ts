import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && value && typeof value === 'object') {
      return this.sanitizeObject(value)
    }
    return value
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    if (obj && typeof obj === 'object') {
      const result: any = {}
      for (const key of Object.keys(obj)) {
        result[key] = this.sanitizeObject(obj[key])
      }
      return result
    }
    if (typeof obj === 'string') {
      return this.sanitizeString(obj)
    }
    return obj
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript\s*:/gi, '')
      .replace(/on(load|error|click|focus|blur|mouseover|mouseout|submit|change|input|keydown|keyup|keypress|toggle|start|ended|play|resize|scroll|unload|beforeunload|hashchange|popstate|storage|message|online|offline|contextmenu|dblclick|drag|drop|copy|cut|paste|abort|animationend|transitionend)\s*=/gi, '')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  }
}
